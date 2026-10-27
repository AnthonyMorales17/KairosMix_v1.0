import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async notifyOrderConfirmed(destinatario: string, pedidoId: string, total: number) {
    this.logger.log(`[Notification] Enviando correo de CONFIRMACIÓN a ${destinatario} para Pedido #${pedidoId} (Total: $${total.toFixed(2)})`);

    try {
      return await this.prisma.notificacionLog.create({
        data: {
          tipo: 'pedido_confirmado',
          destinatario,
          enviadaEn: new Date(),
          exito: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error al registrar NotificacionLog para pedido ${pedidoId}: ${err.message}`);
      return null;
    }
  }

  async notifyOrderFailed(destinatario: string, pedidoId: string, motivo: string) {
    this.logger.warn(`[Notification] Enviando correo de FALLO a ${destinatario} para Pedido #${pedidoId}. Motivo: ${motivo}`);

    try {
      return await this.prisma.notificacionLog.create({
        data: {
          tipo: 'pedido_fallido',
          destinatario,
          enviadaEn: new Date(),
          exito: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error al registrar NotificacionLog para pedido fallido ${pedidoId}: ${err.message}`);
      return null;
    }
  }

  async listLogs() {
    return await this.prisma.notificacionLog.findMany({
      orderBy: { enviadaEn: 'desc' },
      take: 100,
    });
  }
}
