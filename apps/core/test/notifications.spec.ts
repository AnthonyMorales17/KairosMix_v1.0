import { NotificationsService } from '../src/notifications/notifications.service';

describe('NotificationsService (Unit Tests)', () => {
  let notificationsService: NotificationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notificacionLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    notificationsService = new NotificationsService(mockPrisma);
  });

  it('debe registrar un log de notificación para pedido confirmado', async () => {
    mockPrisma.notificacionLog.create.mockResolvedValue({
      id: 'notif-1',
      tipo: 'pedido_confirmado',
      destinatario: 'cliente@test.com',
      exito: true,
      enviadaEn: new Date(),
    });

    const result = await notificationsService.notifyOrderConfirmed('cliente@test.com', 'ped-123', 25.5);
    expect(result.tipo).toBe('pedido_confirmado');
    expect(result.exito).toBe(true);
    expect(mockPrisma.notificacionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'pedido_confirmado',
        destinatario: 'cliente@test.com',
        exito: true,
      }),
    });
  });

  it('debe registrar un log de notificación para pedido fallido', async () => {
    mockPrisma.notificacionLog.create.mockResolvedValue({
      id: 'notif-2',
      tipo: 'pedido_fallido',
      destinatario: 'cliente@test.com',
      exito: true,
      enviadaEn: new Date(),
    });

    const result = await notificationsService.notifyOrderFailed('cliente@test.com', 'ped-456', 'Fondos insuficientes');
    expect(result.tipo).toBe('pedido_fallido');
    expect(mockPrisma.notificacionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'pedido_fallido',
        destinatario: 'cliente@test.com',
        exito: true,
      }),
    });
  });
});
