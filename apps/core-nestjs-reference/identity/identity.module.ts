import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, PrismaService, RedisService],
  exports: [IdentityService],
})
export class IdentityModule {}
