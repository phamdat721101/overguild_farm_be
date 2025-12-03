import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';

@Module({
  controllers: [ProgressionController],
  providers: [ProgressionService, PrismaClient],
  exports: [ProgressionService],
})
export class ProgressionModule {}


