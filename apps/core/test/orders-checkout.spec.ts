import { OrdersService } from '../src/orders/orders.service';
import { BadRequestException } from '@nestjs/common';

describe('OrdersService - Checkout Transactional Flow (Unit Tests)', () => {
  let ordersService: OrdersService;
  let mockPrisma: any;
  let mockBillingService: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockPrisma = {
      ingrediente: {
        findMany: jest.fn(),
      },
      pedido: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      pedidoItem: {
        create: jest.fn(),
      },
      stock: {
        update: jest.fn(),
      },
      factura: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(mockPrisma)),
    };

    mockBillingService = {
      processPayment: jest.fn(),
    };

    mockNotificationsService = {
      notifyOrderConfirmed: jest.fn(),
      notifyOrderFailed: jest.fn(),
    };

    ordersService = new OrdersService(mockPrisma, mockBillingService, mockNotificationsService);
  });

  it('Paso 1: Debe rechazar el checkout si no hay suficiente stock antes de crear nada', async () => {
    mockPrisma.ingrediente.findMany.mockResolvedValue([
      {
        id: 10,
        nombre: 'Almendra Tostada',
        precioPorGramo: 0.04,
        activo: true,
        stock: { gramosDisponibles: 50 }, // Solo 50g disponible
      },
    ]);

    await expect(
      ordersService.checkout('user-123', 'cliente@test.com', {
        items: [{ ingredienteId: 10, gramos: 100 }], // Pide 100g
        metodoPago: 'TARJETA_CREDITO',
      })
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.pedido.create).not.toHaveBeenCalled();
  });

  it('Paso 2 & 4: Flujo Exitoso -> Descuenta stock, crea Pedido (STOCK_RESERVADO), pago exitoso -> Factura (PAGADO), Pedido (CONFIRMADO)', async () => {
    mockPrisma.ingrediente.findMany.mockResolvedValue([
      {
        id: 1,
        nombre: 'Almendra',
        precioPorGramo: 0.05,
        activo: true,
        stock: { gramosDisponibles: 500 },
      },
    ]);

    mockPrisma.pedido.create.mockResolvedValue({
      id: 'ped-1001',
      clienteId: 'user-123',
      estado: 'STOCK_RESERVADO',
      total: 5.0,
    });

    mockBillingService.processPayment.mockResolvedValue({
      success: true,
      transactionId: 'tx_success_123',
    });

    mockPrisma.factura.create.mockResolvedValue({
      id: 'fac-1001',
      pedidoId: 'ped-1001',
      monto: 5.0,
      estadoPago: 'PAGADO',
    });

    mockPrisma.pedido.update.mockResolvedValue({
      id: 'ped-1001',
      estado: 'CONFIRMADO',
      items: [{ id: 'item-1', ingredienteId: 1, gramos: 100 }],
    });

    const result = await ordersService.checkout('user-123', 'cliente@test.com', {
      items: [{ ingredienteId: 1, gramos: 100 }],
      metodoPago: 'TARJETA_CREDITO',
    });

    expect(result.success).toBe(true);
    expect(result.estado).toBe('CONFIRMADO');
    expect(mockPrisma.stock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ingredienteId: 1 },
        data: { gramosDisponibles: { decrement: 100 } },
      })
    );
    expect(mockNotificationsService.notifyOrderConfirmed).toHaveBeenCalledWith(
      'cliente@test.com',
      'ped-1001',
      5.0
    );
  });

  it('Paso 5: Flujo de Compensación -> Si el pago falla, revierte stock y marca Pedido FALLIDO', async () => {
    mockPrisma.ingrediente.findMany.mockResolvedValue([
      {
        id: 1,
        nombre: 'Almendra',
        precioPorGramo: 0.05,
        activo: true,
        stock: { gramosDisponibles: 500 },
      },
    ]);

    mockPrisma.pedido.create.mockResolvedValue({
      id: 'ped-1002',
      clienteId: 'user-123',
      estado: 'STOCK_RESERVADO',
      total: 5.0,
    });

    // Simula fallo en pasarela de pago
    mockBillingService.processPayment.mockResolvedValue({
      success: false,
      transactionId: 'tx_fail_999',
      errorMessage: 'Fondos insuficientes',
    });

    const result = await ordersService.checkout('user-123', 'cliente@test.com', {
      items: [{ ingredienteId: 1, gramos: 100 }],
      metodoPago: 'TARJETA_CREDITO',
      simulateFailure: true,
    });

    expect(result.success).toBe(false);
    expect(result.estado).toBe('FALLIDO');
    expect(result.stockRevertido).toBe(true);

    // Verifica que se ejecutó la reversión del stock (increment)
    expect(mockPrisma.stock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ingredienteId: 1 },
        data: { gramosDisponibles: { increment: 100 } },
      })
    );

    // Verifica que se marcó como FALLIDO
    expect(mockPrisma.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ped-1002' },
        data: { estado: 'FALLIDO' },
      })
    );

    // Notificación de fallo registrada
    expect(mockNotificationsService.notifyOrderFailed).toHaveBeenCalled();
  });
});
