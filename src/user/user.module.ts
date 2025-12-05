import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { JwtModule } from "@nestjs/jwt";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [JwtModule],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [UserService],
})
export class UserModule {}
