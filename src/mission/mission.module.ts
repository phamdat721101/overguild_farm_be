import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';

@Module({
  controllers: [MissionController],
  providers: [MissionService, PrismaClient],
  exports: [MissionService],
})
export class MissionModule {}

