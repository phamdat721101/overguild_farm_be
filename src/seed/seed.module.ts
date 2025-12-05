import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { JwtModule } from "@nestjs/jwt";
import { SeedController } from "./seed.controller";
import { SeedService } from "./seed.service";

@Module({
  imports: [JwtModule],
  controllers: [SeedController],
  providers: [
    SeedService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [SeedService],
})
export class SeedModule {}
