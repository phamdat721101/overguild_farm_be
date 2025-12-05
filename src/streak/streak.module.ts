import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaClient } from "@prisma/client";
import { StreakController } from "./streak.controller";
import { StreakService } from "./streak.service";
import { StreakScheduler } from "./streak.scheduler";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [ScheduleModule.forRoot(), InventoryModule],
  controllers: [StreakController],
  providers: [StreakService, StreakScheduler, PrismaClient],
  exports: [StreakService],
})
export class StreakModule {}
