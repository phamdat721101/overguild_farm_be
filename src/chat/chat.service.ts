import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { FriendService } from "../friend/friend.service";
import { MessageType } from "./dto/send-message.dto";

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaClient,
    private friendService: FriendService
  ) {}

  // Get or create direct conversation between two users
  async getOrCreateConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException("Cannot create conversation with yourself");
    }

    // Check if participant exists
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
    });
    if (!participant) {
      throw new NotFoundException("User not found");
    }

    // Check if they are friends
    const areFriends = await this.friendService.areFriends(
      userId,
      participantId
    );
    if (!areFriends) {
      throw new ForbiddenException("You can only chat with friends");
    }

    // Find existing direct conversation
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: participantId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: "DIRECT",
        members: {
          create: [{ userId }, { userId: participantId }],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    return conversation;
  }

  // Get all conversations for a user
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const member = conv.members.find((m) => m.userId === userId);
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: member?.lastReadAt || new Date(0) },
          },
        });

        return {
          ...conv,
          unreadCount,
          lastMessage: conv.messages[0] || null,
        };
      })
    );

    return conversationsWithUnread;
  }

  // Get messages for a conversation
  async getMessages(
    userId: string,
    conversationId: string,
    limit = 50,
    before?: string
  ) {
    // Verify user is member of conversation
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Not a member of this conversation");
    }

    const where: any = { conversationId };
    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return messages.reverse();
  }

  // Send a message
  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    type: MessageType = MessageType.TEXT
  ) {
    // Verify user is member of conversation
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Not a member of this conversation");
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type,
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Update conversation's updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // Mark conversation as read
  async markAsRead(userId: string, conversationId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Not a member of this conversation");
    }

    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });

    return { message: "Marked as read" };
  }

  // Get conversation by ID
  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException("Not a member of this conversation");
    }

    return conversation;
  }

  // Get conversation members (for WebSocket room management)
  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
}
