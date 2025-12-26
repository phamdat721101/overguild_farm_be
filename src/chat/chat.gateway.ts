import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";
import { MessageType } from "./dto/send-message.dto";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger("ChatGateway");
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
      client.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
    } catch (error: any) {
      this.logger.error(
        `Authentication failed for ${client.id}: ${error.message}`
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(
        `User ${client.userId} disconnected (socket: ${client.id})`
      );
    }
  }

  @SubscribeMessage("joinConversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (!client.userId) return { success: false, error: "Not authenticated" };

    try {
      await this.chatService.getConversation(
        client.userId,
        data.conversationId
      );
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(
        `User ${client.userId} joined conversation ${data.conversationId}`
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("leaveConversation")
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: string; content: string; type?: MessageType }
  ) {
    if (!client.userId) return { success: false, error: "Not authenticated" };

    try {
      const message = await this.chatService.sendMessage(
        client.userId,
        data.conversationId,
        data.content,
        data.type || MessageType.TEXT
      );

      this.server
        .to(`conversation:${data.conversationId}`)
        .emit("newMessage", message);

      const memberIds = await this.chatService.getConversationMemberIds(
        data.conversationId
      );
      memberIds.forEach((memberId) => {
        if (memberId !== client.userId) {
          this.server.to(`user:${memberId}`).emit("messageNotification", {
            conversationId: data.conversationId,
            message,
          });
        }
      });

      return { success: true, message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean }
  ) {
    if (!client.userId) return;

    client.to(`conversation:${data.conversationId}`).emit("userTyping", {
      userId: client.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("markRead")
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (!client.userId) return { success: false, error: "Not authenticated" };

    try {
      await this.chatService.markAsRead(client.userId, data.conversationId);

      client.to(`conversation:${data.conversationId}`).emit("messageRead", {
        userId: client.userId,
        conversationId: data.conversationId,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
