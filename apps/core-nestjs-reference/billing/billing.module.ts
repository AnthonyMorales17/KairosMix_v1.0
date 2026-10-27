import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '../common/services/prisma.service';
import { StubPaymentProvider } from './providers/stub-payment.provider';
import { PAYMENT_PROVIDER_TOKEN } from './interfaces/payment-provider.interface';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    PrismaService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: StubPaymentProvider,
    },
  ],
  exports: [BillingService, PAYMENT_PROVIDER_TOKEN],
})
export class BillingModule {}
