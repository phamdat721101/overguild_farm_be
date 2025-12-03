import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaClient],
  exports: [InventoryService],
})
export class InventoryModule {}
