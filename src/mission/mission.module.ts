import { Module, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MissionController } from './mission.controller';
import { MissionService } from './mission.service';
import { SoulboundTokenModule } from '../soulbound-token/soulbound-token.module';

@Module({
  imports: [forwardRef(() => SoulboundTokenModule)],
  controllers: [MissionController],
  providers: [MissionService, PrismaClient],
  exports: [MissionService],
})
export class MissionModule {}

