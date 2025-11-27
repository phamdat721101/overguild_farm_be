import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private nonces = new Map<string, { nonce: string; message: string; expiresAt: number }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
  ) {}

  async getChallenge(walletAddress: string) {
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const timestamp = new Date().toISOString();
    const message = `Sign this message to login to OverGuild:\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.nonces.set(walletAddress.toLowerCase(), { nonce, message, expiresAt });

    return { nonce, message };
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
                stage: 'SEED', // Bắt đầu từ SEED
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
            plant: true, // Include plant info
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
      isNewUser: user.lands.length === 1, // Nếu chỉ có 1 land = new user
    };
  }
}
