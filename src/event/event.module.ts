import { Module, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { FundxApiClient } from './fundx-api.client';
import { MissionModule } from '../mission/mission.module';

@Module({
  imports: [forwardRef(() => MissionModule)],
  controllers: [EventController],
  providers: [EventService, PrismaClient, FundxApiClient],
  exports: [EventService],
})
export class EventModule {}

