import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryModule } from "../inventory/inventory.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

@Module({
  imports: [InventoryModule],
  controllers: [ShopController],
  providers: [ShopService, PrismaClient],
})
export class ShopModule {}


