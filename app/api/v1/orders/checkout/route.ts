import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { z } from 'zod';

const CheckoutItemSchema = z.object({
  ingredienteId: z.number().int({ message: 'ingredienteId debe ser un entero' }),
  gramos: z.number().positive({ message: 'gramos debe ser mayor a 0' }),
});

const CheckoutSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, { message: 'El pedido debe contener al menos un ingrediente' }),
  metodoPago: z.enum(['TARJETA_CREDITO', 'PAYPHONE', 'TRANSFERENCIA']).optional().default('TARJETA_CREDITO'),
  simulateFailure: z.boolean().optional().default(false),
});

// POST /api/v1/orders/checkout (Autenticado)
export async function POST(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'Debe iniciar sesión para realizar un pedido' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = CheckoutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Datos de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items, metodoPago, simulateFailure } = parseResult.data;

    // PASO 1: Validación preliminar (existencia, activo, precio obligatorio > 0)
    const ingredientIds = items.map((i) => i.ingredienteId);
    const ingredientes = await prisma.ingrediente.findMany({
      where: { id: { in: ingredientIds }, activo: true },
      include: { stock: true },
    });

    if (ingredientes.length !== items.length) {
      return NextResponse.json({ message: 'Uno o más ingredientes no existen o están inactivos' }, { status: 400 });
    }

    const ingredientMap = new Map<number, any>();
    for (const ing of ingredientes) {
      ingredientMap.set(ing.id, ing);
    }

    let calculatedTotal = 0;
    const validatedItems: Array<{
      ingredienteId: number;
      nombre: string;
      gramos: number;
      precioUnitario: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const ing = ingredientMap.get(item.ingredienteId);

      if (ing.precioPorGramo == null || ing.precioPorGramo <= 0) {
        return NextResponse.json(
          { message: `El ingrediente "${ing.nombre}" no tiene un precio configurado. No se puede vender.` },
          { status: 400 }
        );
      }

      const stockDisponible = ing.stock?.gramosDisponibles ?? 0;
      if (stockDisponible < item.gramos) {
        return NextResponse.json(
          {
            message: `Stock insuficiente para "${ing.nombre}". Solicitado: ${item.gramos}g, Disponible: ${stockDisponible}g`,
            error: 'INSUFFICIENT_STOCK',
            ingredienteId: item.ingredienteId,
            disponible: stockDisponible,
          },
          { status: 400 }
        );
      }

      const subtotal = item.gramos * ing.precioPorGramo;
      calculatedTotal += subtotal;

      validatedItems.push({
        ingredienteId: item.ingredienteId,
        nombre: ing.nombre,
        gramos: item.gramos,
        precioUnitario: ing.precioPorGramo,
        subtotal,
      });
    }

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    // PASO 2: Transacción atómica de reserva con updateMany + gte (prevención de sobreventa)
    let reservedPedido: any;
    try {
      reservedPedido = await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedido.create({
          data: {
            clienteId: authUser.id,
            estado: 'STOCK_RESERVADO',
            total: calculatedTotal,
          },
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
            throw new Error(`Stock insuficiente para el ingrediente #${item.ingredienteId} (condición de carrera detectada)`);
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
      return NextResponse.json(
        { message: `No se pudo reservar el stock del pedido: ${err.message}` },
        { status: 400 }
      );
    }

    // PASO 3: Pasarela de pagos Stub / Simulación
    const isPaymentApproved = !simulateFailure;
    const transactionId = isPaymentApproved
      ? `tx_stub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      : `tx_failed_${Date.now()}`;

    // PASO 4: Pago aprobado -> Confirmación + Facturación
    if (isPaymentApproved) {
      const confirmedResult = await prisma.$transaction(async (tx) => {
        const factura = await tx.factura.create({
          data: {
            pedidoId: reservedPedido.id,
            monto: calculatedTotal,
            metodoPago,
            estadoPago: 'PAGADO',
          },
        });

        const updatedPedido = await tx.pedido.update({
          where: { id: reservedPedido.id },
          data: { estado: 'CONFIRMADO' },
          include: { items: true, factura: true },
        });

        return { pedido: updatedPedido, factura };
      });

      // Aislamiento try/catch para Notificación Log
      try {
        await prisma.notificacionLog.create({
          data: {
            tipo: 'pedido_confirmado',
            destinatario: authUser.email,
            enviadaEn: new Date(),
            exito: true,
          },
        });
      } catch (logErr: any) {
        console.error('Error no crítico registrando NotificacionLog de confirmación:', logErr.message);
      }

      try {
        await prisma.eventoAuditoria.create({
          data: {
            usuarioId: authUser.id,
            accion: 'CHECKOUT_SUCCESS',
            entidad: 'Pedido',
            entidadId: reservedPedido.id,
            payload: {
              total: calculatedTotal,
              metodoPago,
              transactionId,
              itemsCount: validatedItems.length,
            },
            resultado: 'EXITO',
          },
        });
      } catch (audErr: any) {
        console.error('Error registrando EventoAuditoria en checkout exitoso:', audErr.message);
      }

      return NextResponse.json({
        success: true,
        mensaje: '¡Pedido confirmado y pagado exitosamente!',
        pedidoId: reservedPedido.id,
        estado: 'CONFIRMADO',
        total: calculatedTotal,
        transactionId,
        factura: confirmedResult.factura,
        items: confirmedResult.pedido.items,
      });
    }

    // PASO 5: Pago rechazado -> Transacción de Compensación (reversión de stock)
    try {
      await prisma.$transaction(async (tx) => {
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
    } catch (compErr: any) {
      console.error(`FALLO CRÍTICO en compensación de stock para pedido ${reservedPedido.id}:`, compErr.message);
    }

    try {
      await prisma.notificacionLog.create({
        data: {
          tipo: 'pedido_fallido',
          destinatario: authUser.email,
          enviadaEn: new Date(),
          exito: true,
        },
      });
    } catch (logErr: any) {
      console.error('Error no crítico registrando NotificacionLog de fallo:', logErr.message);
    }

    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'CHECKOUT_PAYMENT_FAILED_STOCK_REVERTED',
          entidad: 'Pedido',
          entidadId: reservedPedido.id,
          payload: {
            total: calculatedTotal,
            metodoPago,
            transactionId,
            motivo: 'Simulación de fallo en pasarela de pagos. Compensación ejecutada.',
          },
          resultado: 'FALLO',
        },
      });
    } catch (audErr: any) {
      console.error('Error registrando EventoAuditoria en checkout fallido:', audErr.message);
    }

    return NextResponse.json(
      {
        success: false,
        mensaje: 'El pago no pudo ser procesado por la pasarela. Se ejecutó la reversión de stock y el pedido fue marcado como FALLIDO.',
        pedidoId: reservedPedido.id,
        estado: 'FALLIDO',
        total: calculatedTotal,
        stockRevertido: true,
        transactionId,
      },
      { status: 402 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error en checkout' }, { status: 500 });
  }
}
