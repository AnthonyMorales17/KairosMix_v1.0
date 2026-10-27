import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaService } from './common/services/prisma.service';
import { RedisService } from './common/services/redis.service';

@Module({
  imports: [
    IdentityModule,
    CatalogModule,
    OrdersModule,
    BillingModule,
    NotificationsModule,
  ],
  providers: [PrismaService, RedisService],
})
export class AppModule {}
