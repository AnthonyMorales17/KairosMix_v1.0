export interface PaymentResult {
  success: boolean;
  transactionId: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  processPayment(
    pedidoId: string,
    monto: number,
    metodoPago: string,
    simulateFailure?: boolean,
  ): Promise<PaymentResult>;
}

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER_TOKEN';
