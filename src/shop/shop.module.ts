import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryModule } from "../inventory/inventory.module";
import { ProgressionModule } from "../progression/progression.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

@Module({
  imports: [InventoryModule, ProgressionModule],
  controllers: [ShopController],
  providers: [ShopService, PrismaClient],
})
export class ShopModule { }


