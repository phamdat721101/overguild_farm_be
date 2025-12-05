import { Module, forwardRef } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { JwtModule } from "@nestjs/jwt";
import { PlantController } from "./plant.controller";
import { PlantService } from "./plant.service";
import { SeedModule } from "../seed/seed.module";
import { MissionModule } from "../mission/mission.module";
import { SoulboundTokenModule } from "../soulbound-token/soulbound-token.module";

@Module({
  imports: [
    JwtModule,
    SeedModule,
    forwardRef(() => MissionModule),
    forwardRef(() => SoulboundTokenModule),
  ],
  controllers: [PlantController],
  providers: [
    PlantService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [PlantService],
})
export class PlantModule {}
