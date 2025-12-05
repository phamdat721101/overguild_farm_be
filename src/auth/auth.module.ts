import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret",
      signOptions: { expiresIn: "7d" },
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
