import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PhygitalController } from "./phygital.controller";
import { PhygitalService } from "./phygital.service";

@Module({
  controllers: [PhygitalController],
  providers: [PhygitalService, PrismaClient],
})
export class PhygitalModule {}
