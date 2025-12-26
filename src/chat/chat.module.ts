import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { FriendModule } from "../friend/friend.module";

@Module({
  imports: [
    FriendModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  providers: [ChatService, ChatGateway, PrismaClient],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
