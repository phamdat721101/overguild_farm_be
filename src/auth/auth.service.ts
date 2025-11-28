import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
  ) {}

  async login(dto: LoginDto) {
    const { walletAddress, username, network, avatar } = dto;
    const wallet = walletAddress.toLowerCase();

    // Upsert User và tự động tạo 1 Land + 1 Plant starter nếu là lần đầu
    const user = await this.prisma.user.upsert({
      where: { walletAddress: wallet },
      create: {
        walletAddress: wallet,
        network: network || 'sui',
        username: username || null,
        avatar: avatar || null,
        // Tạo 1 mảnh đất (plot 0) với 1 cây starter (SEED)
        lands: {
          create: {
            plotIndex: 0,
            soilQuality: { fertility: 50, hydration: 50 },
            plant: {
              create: {
                type: 'SOCIAL',
                stage: 'SEED',
                lastInteractedAt: new Date(),
                plantedAt: new Date(),
                interactions: 0,
                githubCommits: 0,
                isGoldBranch: false,
              },
            },
          },
        },
      },
      update: {
        ...(username && { username }),
        ...(avatar && { avatar }),
        ...(network && { network }),
      },
      include: {
        lands: {
          include: {
            plant: true,
          },
        },
      },
    });

    const payload = { sub: user.id, walletAddress: user.walletAddress };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        network: user.network,
        username: user.username,
        avatar: user.avatar,
        xp: user.xp,
        reputationScore: user.reputationScore,
        landsCount: user.lands.length,
        plantsCount: user.lands.filter(l => l.plant !== null).length,
      },
      isNewUser: user.lands.length === 1,
    };
  }
}
