import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // In NestJS monolith, wraps PrismaClient instance
  public usuario: any;
  public refreshToken: any;
  public ingrediente: any;
  public alergeno: any;
  public ingredienteAlergeno: any;
  public proveedor: any;
  public stock: any;
  public pedido: any;
  public pedidoItem: any;
  public factura: any;
  public notificacionLog: any;
  public eventoAuditoria: any;

  async onModuleInit() {
    // Connect to PostgreSQL database via Prisma
  }

  async onModuleDestroy() {
    // Disconnect cleanly
  }

  async $transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
    return fn(this);
  }
}
