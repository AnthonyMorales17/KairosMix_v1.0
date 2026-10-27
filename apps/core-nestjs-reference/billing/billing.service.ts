import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { PAYMENT_PROVIDER_TOKEN, PaymentProvider, PaymentResult } from './interfaces/payment-provider.interface';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private paymentProvider: PaymentProvider,
  ) {}

  async processPayment(pedidoId: string, monto: number, metodoPago: string, simulateFailure?: boolean): Promise<PaymentResult> {
    return await this.paymentProvider.processPayment(pedidoId, monto, metodoPago, simulateFailure);
  }

  async createFactura(pedidoId: string, monto: number, metodoPago: string, tx?: any) {
    const client = tx || this.prisma;
    return await client.factura.create({
      data: {
        pedidoId,
        monto,
        metodoPago,
        estadoPago: 'PAGADO',
        emitidaEn: new Date(),
      },
    });
  }

  async getFacturaByPedidoId(pedidoId: string, clienteId?: string, rol?: string) {
    const factura = await this.prisma.factura.findUnique({
      where: { pedidoId },
      include: { pedido: { include: { items: true } } },
    });
    if (!factura) {
      throw new NotFoundException(`Factura para el pedido ${pedidoId} no encontrada`);
    }

    // Un CLIENTE solo puede ver la factura de su propio pedido.
    // admin/vendedor pueden ver cualquiera.
    if (rol === 'CLIENTE' && factura.pedido.clienteId !== clienteId) {
      throw new ForbiddenException('No tienes permiso para ver esta factura');
    }

    return factura;
  }

  async listFacturas() {
    return await this.prisma.factura.findMany({
      include: {
        pedido: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { emitidaEn: 'desc' },
    });
  }
}