import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ethers } from 'ethers';

@Injectable()
export class AuthService {
  private nonces = new Map<string, { nonce: string; expiresAt: number; message: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
  ) {}

  async register(dto: RegisterDto) {
    const { walletAddress } = dto;
    const wallet = walletAddress.toLowerCase();

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    // Tạo user mới với 1 Land + 1 Plant starter
    const user = await this.prisma.user.create({
      data: {
        walletAddress: wallet,
        // Network chỉ là label hiển thị; multi-chain thực sự sẽ được
        // handle riêng sau (nhiều địa chỉ / chain).
        network: 'multi-chain',
        // Các thông tin khác (username, avatar, social links, ...) 
        // sẽ được cập nhật sau qua API update profile / multi-chain setup
        username: null,
        avatar: null,
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
    };
  }

  async login(dto: LoginDto) {
    const { walletAddress, signature, nonce, username, network, avatar } = dto;
    const wallet = walletAddress.toLowerCase();

    const stored = this.nonces.get(wallet);
    if (!stored || stored.nonce !== nonce) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }
    if (Date.now() > stored.expiresAt) {
      this.nonces.delete(wallet);
      throw new UnauthorizedException('Nonce expired');
    }

    let recovered: string;
    try {
      recovered = ethers.verifyMessage(stored.message, signature);
    } catch (e) {
      throw new UnauthorizedException('Invalid signature');
    }

    if (recovered.toLowerCase() !== wallet) {
      throw new UnauthorizedException('Signature does not match wallet');
    }

    this.nonces.delete(wallet);

    const user = await this.prisma.user.upsert({
      where: { walletAddress: wallet },
      create: {
        walletAddress: wallet,
        network: network || 'sui',
        username: username || null,
        avatar: avatar || null,
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
                diggingDuration: 1,
                growingDuration: 12,
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
