import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FertilizerController } from './fertilizer.controller';
import { FertilizerService } from './fertilizer.service';

@Module({
  controllers: [FertilizerController],
  providers: [
    FertilizerService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [FertilizerService],
})
export class FertilizerModule {}

