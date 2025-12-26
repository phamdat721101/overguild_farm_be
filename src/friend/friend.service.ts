import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaClient) {}

  // Search users by username
  async searchUsers(userId: string, query?: string) {
    const where: any = {
      id: { not: userId },
    };

    if (query) {
      where.username = { contains: query, mode: "insensitive" };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        avatar: true,
        xp: true,
      },
      take: 20,
    });

    // Check friendship status for each user
    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await this.checkFriendship(userId, user.id);
        const pendingRequest = await this.getPendingRequest(userId, user.id);

        return {
          ...user,
          isFriend: !!friendship,
          hasPendingRequest: !!pendingRequest,
          pendingRequestId: pendingRequest?.id,
          requestDirection: pendingRequest
            ? pendingRequest.senderId === userId
              ? "sent"
              : "received"
            : null,
        };
      })
    );

    return usersWithStatus;
  }

  // Send friend request
  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException("Cannot send friend request to yourself");
    }

    // Check if receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      throw new NotFoundException("User not found");
    }

    // Check if already friends
    const existingFriendship = await this.checkFriendship(senderId, receiverId);
    if (existingFriendship) {
      throw new ConflictException("Already friends with this user");
    }

    // Check for existing request (either direction)
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: "PENDING" },
          { senderId: receiverId, receiverId: senderId, status: "PENDING" },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.senderId === senderId) {
        throw new ConflictException("Friend request already sent");
      } else {
        // Auto-accept if receiver already sent a request
        return this.acceptFriendRequest(senderId, existingRequest.id);
      }
    }

    const request = await this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: "PENDING",
      },
    });

    // Fetch with relations
    const fullRequest = await this.prisma.friendRequest.findUnique({
      where: { id: request.id },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    return {
      message: "Friend request sent",
      request: fullRequest,
    };
  }

  // Get received friend requests
  async getReceivedRequests(userId: string, status?: string) {
    const where: any = { receiverId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.friendRequest.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, avatar: true, xp: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Get sent friend requests
  async getSentRequests(userId: string, status?: string) {
    const where: any = { senderId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.friendRequest.findMany({
      where,
      include: {
        receiver: {
          select: { id: true, username: true, avatar: true, xp: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Accept friend request
  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException("Cannot accept this request");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Request already processed");
    }

    // Use transaction to update request and create friendship
    const [updatedRequest, friendship] = await this.prisma.$transaction([
      this.prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
      }),
      this.prisma.friendship.create({
        data: {
          user1Id:
            request.senderId < request.receiverId
              ? request.senderId
              : request.receiverId,
          user2Id:
            request.senderId < request.receiverId
              ? request.receiverId
              : request.senderId,
        },
      }),
    ]);

    return {
      message: "Friend request accepted",
      friendship,
    };
  }

  // Reject friend request
  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException("Cannot reject this request");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Request already processed");
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    return { message: "Friend request rejected" };
  }

  // Cancel sent friend request
  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException("Friend request not found");
    }

    if (request.senderId !== userId) {
      throw new BadRequestException("Cannot cancel this request");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Request already processed");
    }

    await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { message: "Friend request cancelled" };
  }

  // Get friends list
  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, username: true, avatar: true, xp: true } },
        user2: { select: { id: true, username: true, avatar: true, xp: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return friendships.map((f) => ({
      friendshipId: f.id,
      friend: f.user1Id === userId ? f.user2 : f.user1,
      since: f.createdAt,
    }));
  }

  // Remove friend
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.checkFriendship(userId, friendId);

    if (!friendship) {
      throw new NotFoundException("Friendship not found");
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { message: "Friend removed" };
  }

  // Helper: Check if two users are friends
  private async checkFriendship(userId1: string, userId2: string) {
    if (userId1 === userId2) return null;

    const [smaller, larger] =
      userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    return this.prisma.friendship.findFirst({
      where: {
        user1Id: smaller,
        user2Id: larger,
      },
    });
  }

  // Helper: Get pending request between two users
  private async getPendingRequest(userId1: string, userId2: string) {
    return this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2, status: "PENDING" },
          { senderId: userId2, receiverId: userId1, status: "PENDING" },
        ],
      },
    });
  }

  // Get friend count
  async getFriendCount(userId: string) {
    return this.prisma.friendship.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });
  }

  // Check if two users are friends (public method)
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.checkFriendship(userId1, userId2);
    return !!friendship;
  }
}
