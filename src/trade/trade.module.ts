import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { TradeService } from "./trade.service";
import { TradeController } from "./trade.controller";

@Module({
  providers: [TradeService, PrismaClient],
  controllers: [TradeController],
  exports: [TradeService],
})
export class TradeModule {}
