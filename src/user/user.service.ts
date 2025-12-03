import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        network: true,
        username: true,
        avatar: true,
        bio: true,
        twitter: true,
        github: true,
        discord: true,
        xp: true,
        reputationScore: true,
        createdAt: true,
        updatedAt: true,
        lands: {
          include: {
            plant: true,
          },
        },
        inventoryItems: true,
        _count: {
          select: {
            lands: true,
            inventoryItems: true,
            missionLogs: true,
            soulboundTokens: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        walletAddress: true,
        network: true,
        username: true,
        avatar: true,
        bio: true,
        twitter: true,
        github: true,
        discord: true,
        xp: true,
        reputationScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
