import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { LandController } from "./land.controller";
import { LandService } from "./land.service";

@Module({
  controllers: [LandController],
  providers: [
    LandService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [LandService],
})
export class LandModule {}
