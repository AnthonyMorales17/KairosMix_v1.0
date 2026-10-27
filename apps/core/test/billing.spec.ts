import { BillingService } from '../src/billing/billing.service';
import { StubPaymentProvider } from '../src/billing/providers/stub-payment.provider';

describe('BillingService (Unit Tests)', () => {
  let billingService: BillingService;
  let stubProvider: StubPaymentProvider;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      factura: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    stubProvider = new StubPaymentProvider();
    billingService = new BillingService(mockPrisma, stubProvider);
  });

  it('debe procesar el pago exitosamente a través del PaymentProvider stub', async () => {
    const result = await billingService.processPayment('pedido-1', 45.5, 'TARJETA_CREDITO', false);
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^tx_stub_/);
  });

  it('debe simular el fallo cuando simulateFailure = true', async () => {
    const result = await billingService.processPayment('pedido-2', 20.0, 'PAYPHONE', true);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('debe crear una factura con estado PAGADO', async () => {
    mockPrisma.factura.create.mockResolvedValue({
      id: 'fac-1',
      pedidoId: 'pedido-1',
      monto: 45.5,
      estadoPago: 'PAGADO',
    });

    const factura = await billingService.createFactura('pedido-1', 45.5, 'TARJETA_CREDITO');
    expect(factura.estadoPago).toBe('PAGADO');
    expect(mockPrisma.factura.create).toHaveBeenCalled();
  });
});
