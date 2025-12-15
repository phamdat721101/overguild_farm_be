import { Module, forwardRef } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { JwtModule } from "@nestjs/jwt";
import { BullModule } from "@nestjs/bull";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PlantController } from "./plant.controller";
import { PlantService } from "./plant.service";
import { SeedModule } from "../seed/seed.module";
import { MissionModule } from "../mission/mission.module";
import { SoulboundTokenModule } from "../soulbound-token/soulbound-token.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PLANT_QUEUE } from "./queues/plant.queue.constants";
import { PlantProcessor } from "./queues/plant.processor";
import { PlantQueueService } from "./queues/plant.queue.service";
import { PlantScheduler } from "./schedulers/plant.scheduler";

@Module({
  imports: [
    JwtModule,
    SeedModule,
    forwardRef(() => MissionModule),
    forwardRef(() => SoulboundTokenModule),
    forwardRef(() => InventoryModule),
    BullModule.registerQueue({
      name: PLANT_QUEUE,
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlantController],
  providers: [
    PlantService,
    PlantProcessor,
    PlantQueueService,
    PlantScheduler,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [PlantService, PlantQueueService],
})
export class PlantModule { }
