import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, PrismaService, RedisService],
  exports: [CatalogService],
})
export class CatalogModule {}
