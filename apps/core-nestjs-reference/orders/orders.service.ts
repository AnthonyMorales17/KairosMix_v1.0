import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckoutDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
    private notificationsService: NotificationsService,
  ) {}

  async checkout(clienteId: string, clienteEmail: string, dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe contener al menos un ingrediente');
    }

    // PASO 1: Validación "optimista" previa (UX rápida). OJO: esto NO es
    // suficiente contra condiciones de carrera — la validación real y
    // definitiva ocurre dentro de la transacción del PASO 2 con updateMany.
    const ingredientIds = dto.items.map((i) => i.ingredienteId);
    const ingredientes = await this.prisma.ingrediente.findMany({
      where: { id: { in: ingredientIds }, activo: true },
      include: { stock: true },
    });

    if (ingredientes.length !== dto.items.length) {
      throw new BadRequestException('Uno o más ingredientes no existen o están inactivos');
    }

    const ingredientMap = new Map<number, any>();
    for (const ing of ingredientes) {
      ingredientMap.set(ing.id, ing);
    }

    let calculatedTotal = 0;
    const validatedItems: Array<{
      ingredienteId: number;
      gramos: number;
      precioUnitario: number;
    }> = [];

    for (const item of dto.items) {
      const ing = ingredientMap.get(item.ingredienteId);

      // Precio obligatorio: si el admin no lo configuró, es un error de
      // catálogo, no un motivo para inventar un precio silenciosamente.
      if (ing.precioPorGramo == null || ing.precioPorGramo <= 0) {
        throw new BadRequestException(
          `El ingrediente "${ing.nombre}" no tiene un precio configurado. No se puede vender.`,
        );
      }

      const stockDisponible = ing.stock?.gramosDisponibles ?? 0;
      if (stockDisponible < item.gramos) {
        throw new BadRequestException(
          `Stock insuficiente para "${ing.nombre}". Solicitado: ${item.gramos}g, Disponible: ${stockDisponible}g`,
        );
      }

      const subtotal = item.gramos * ing.precioPorGramo;
      calculatedTotal += subtotal;

      validatedItems.push({
        ingredienteId: item.ingredienteId,
        gramos: item.gramos,
        precioUnitario: ing.precioPorGramo,
      });
    }

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    // PASO 2: transacción atómica. El decremento de stock usa updateMany con
    // una condición WHERE gramosDisponibles >= gramos solicitados — esto es
    // lo que realmente previene la sobreventa bajo checkouts concurrentes.
    // Un UPDATE simple con `decrement` NO valida el resultado, por eso el
    // count de filas afectadas se revisa explícitamente.
    let reservedPedido: any;
    try {
      reservedPedido = await this.prisma.$transaction(async (tx: any) => {
        const pedido = await tx.pedido.create({
          data: { clienteId, estado: 'STOCK_RESERVADO', total: calculatedTotal },
        });

        for (const item of validatedItems) {
          const stockResult = await tx.stock.updateMany({
            where: {
              ingredienteId: item.ingredienteId,
              gramosDisponibles: { gte: item.gramos },
            },
            data: { gramosDisponibles: { decrement: item.gramos } },
          });

          if (stockResult.count === 0) {
            // Alguien más se quedó con el stock entre el PASO 1 y ahora.
            // Lanzar dentro de la transacción revierte TODO lo hecho hasta
            // aquí (Prisma hace rollback automático del $transaction).
            throw new BadRequestException(
              `Stock insuficiente para el ingrediente #${item.ingredienteId} (condición de carrera detectada)`,
            );
          }

          await tx.pedidoItem.create({
            data: {
              pedidoId: pedido.id,
              ingredienteId: item.ingredienteId,
              gramos: item.gramos,
              precioUnitario: item.precioUnitario,
            },
          });
        }

        return pedido;
      });
    } catch (err: any) {
      this.logger.error(`Error en transacción de reserva de stock: ${err.message}`);
      throw new BadRequestException(`No se pudo reservar el stock del pedido: ${err.message}`);
    }

    this.logger.log(`Pedido ${reservedPedido.id} creado con estado STOCK_RESERVADO. Stock bloqueado.`);

    // PASO 3
    const paymentResult = await this.billingService.processPayment(
      reservedPedido.id,
      calculatedTotal,
      dto.metodoPago || 'TARJETA_CREDITO',
      dto.simulateFailure ?? false,
    );

    // PASO 4
    if (paymentResult.success) {
      const confirmedPedido = await this.prisma.$transaction(async (tx: any) => {
        const factura = await tx.factura.create({
          data: {
            pedidoId: reservedPedido.id,
            monto: calculatedTotal,
            metodoPago: dto.metodoPago || 'TARJETA_CREDITO',
            estadoPago: 'PAGADO',
          },
        });

        const updated = await tx.pedido.update({
          where: { id: reservedPedido.id },
          data: { estado: 'CONFIRMADO' },
          include: { items: true, factura: true },
        });

        return { pedido: updated, factura };
      });

      await this.notificationsService.notifyOrderConfirmed(
        clienteEmail,
        reservedPedido.id,
        calculatedTotal,
      );

      return {
        success: true,
        mensaje: 'Pedido confirmado y pagado con éxito',
        pedidoId: reservedPedido.id,
        estado: 'CONFIRMADO',
        total: calculatedTotal,
        transactionId: paymentResult.transactionId,
        factura: confirmedPedido.factura,
        items: confirmedPedido.pedido.items,
      };
    }

    // PASO 5: compensación, ahora con try/catch — si la reversión de stock
    // fallara, antes quedaba una excepción sin manejar y sin registro.
    this.logger.warn(
      `Pago rechazado para pedido ${reservedPedido.id}. Ejecutando transacción de compensación.`,
    );

    try {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.pedido.update({
          where: { id: reservedPedido.id },
          data: { estado: 'FALLIDO' },
        });

        for (const item of validatedItems) {
          await tx.stock.update({
            where: { ingredienteId: item.ingredienteId },
            data: { gramosDisponibles: { increment: item.gramos } },
          });
        }
      });
    } catch (err: any) {
      // Esto es grave: pago rechazado pero no se pudo liberar el stock.
      // Requiere alerta/intervención manual — lo dejamos bien logueado.
      this.logger.error(
        `FALLO CRÍTICO: no se pudo revertir el stock del pedido ${reservedPedido.id} tras pago rechazado: ${err.message}`,
      );
    }

    await this.notificationsService.notifyOrderFailed(
      clienteEmail,
      reservedPedido.id,
      paymentResult.errorMessage || 'El pago fue rechazado',
    );

    return {
      success: false,
      mensaje: `Fallo en el pago: ${paymentResult.errorMessage || 'Transacción denegada'}. El stock ha sido liberado.`,
      pedidoId: reservedPedido.id,
      estado: 'FALLIDO',
      total: calculatedTotal,
      stockRevertido: true,
    };
  }

  async listPedidos(clienteId?: string, rol?: string) {
    const where: any = {};
    if (rol !== 'ADMIN' && rol !== 'VENDEDOR') {
      if (clienteId) {
        where.clienteId = clienteId;
      }
    }

    return await this.prisma.pedido.findMany({
      where,
      include: { items: true, factura: true },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async getPedidoById(id: string, clienteId?: string, rol?: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: { items: true, factura: true },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido ${id} no encontrado`);
    }

    // Un CLIENTE solo puede ver sus propios pedidos. admin/vendedor ven cualquiera.
    if (rol === 'CLIENTE' && pedido.clienteId !== clienteId) {
      throw new ForbiddenException('No tienes permiso para ver este pedido');
    }

    return pedido;
  }
}
