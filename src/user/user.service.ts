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
        xp: true,
        reputationScore: true,
        createdAt: true,
        updatedAt: true,
        lands: {
          include: {
            plant: true, // Include plant info for each land
          },
        },
        _count: {
          select: {
            lands: true,
            inventory: true,
            missions: true,
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
        xp: true,
        reputationScore: true,
        updatedAt: true,
      },
    });
  }
}
