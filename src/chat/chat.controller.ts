import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ChatService } from "./chat.service";
import { CreateConversationDto, SendMessageDto, GetMessagesDto } from "./dto";

@ApiTags("Chat")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversation")
  @ApiOperation({ summary: "Get or create direct conversation" })
  async getOrCreateConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateConversationDto
  ) {
    return this.chatService.getOrCreateConversation(
      user.sub,
      dto.participantId
    );
  }

  @Get("conversations")
  @ApiOperation({ summary: "Get all conversations" })
  async getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.sub);
  }

  @Get("conversation/:conversationId")
  @ApiOperation({ summary: "Get conversation details" })
  async getConversation(
    @CurrentUser() user: any,
    @Param("conversationId") conversationId: string
  ) {
    return this.chatService.getConversation(user.sub, conversationId);
  }

  @Get("conversation/:conversationId/messages")
  @ApiOperation({ summary: "Get messages in conversation" })
  async getMessages(
    @CurrentUser() user: any,
    @Param("conversationId") conversationId: string,
    @Query() dto: GetMessagesDto
  ) {
    return this.chatService.getMessages(
      user.sub,
      conversationId,
      dto.limit,
      dto.before
    );
  }

  @Post("message")
  @ApiOperation({ summary: "Send message" })
  async sendMessage(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(
      user.sub,
      dto.conversationId,
      dto.content,
      dto.type
    );
  }

  @Post("conversation/:conversationId/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  async markAsRead(
    @CurrentUser() user: any,
    @Param("conversationId") conversationId: string
  ) {
    return this.chatService.markAsRead(user.sub, conversationId);
  }
}
