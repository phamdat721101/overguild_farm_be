import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { FriendService } from "./friend.service";
import { FriendController } from "./friend.controller";

@Module({
  providers: [FriendService, PrismaClient],
  controllers: [FriendController],
  exports: [FriendService],
})
export class FriendModule {}
