import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentResult } from '../interfaces/payment-provider.interface';

@Injectable()
export class StubPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(StubPaymentProvider.name);

  async processPayment(
    pedidoId: string,
    monto: number,
    metodoPago: string,
    simulateFailure: boolean = false,
  ): Promise<PaymentResult> {
    this.logger.log(
      `[PaymentStub] Procesando pago para Pedido ${pedidoId}, Monto: $${monto.toFixed(2)}, Método: ${metodoPago}, SimularFallo: ${simulateFailure}`
    );

    // If explicit simulation of failure is requested (e.g. testing compensation rollback)
    if (simulateFailure) {
      this.logger.warn(`[PaymentStub] Simulación: Pago RECHAZADO por fondos insuficientes o error de pasarela.`);
      return {
        success: false,
        transactionId: `tx_failed_${Date.now()}`,
        errorMessage: 'Transacción rechazada por la pasarela simulada (Fondos insuficientes o timeout de banco).',
      };
    }

    const transactionId = `tx_stub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.logger.log(`[PaymentStub] Pago APROBADO exitosamente. Transacción ID: ${transactionId}`);

    return {
      success: true,
      transactionId,
    };
  }
}
