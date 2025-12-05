import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private nonces = new Map<
    string,
    { nonce: string; expiresAt: number; message: string }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient
  ) {}

  async register(dto: RegisterDto) {
    const { walletAddress, username } = dto;
    const wallet = walletAddress.toLowerCase();

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (existingUser) {
      throw new ConflictException(
        "User with this wallet address already exists"
      );
    }

    // Kiểm tra username đã tồn tại chưa (nếu có)
    if (username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: { username },
      });

      if (existingUsername) {
        throw new ConflictException("Username already taken");
      }
    }

    // Tạo user mới với 1 Land + 1 Plant starter
    const user = await this.prisma.user.create({
      data: {
        walletAddress: wallet,
        network: "multi-chain",
        username: username || null,
        avatar: null,
        // Tạo 1 mảnh đất (plot 0) với 1 cây starter (SEED)
        lands: {
          create: {
            plotIndex: 0,
            soilQuality: { fertility: 50, hydration: 50 },
            plant: {
              create: {
                type: "SOCIAL",
                stage: "SEED",
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
        gold: user.balanceGold,
        ruby: user.balanceRuby,
        landsCount: user.lands.length,
        plantsCount: user.lands.filter((l) => l.plant !== null).length,
      },
    };
  }

  async login(dto: LoginDto) {
    const { walletAddress } = dto;
    const wallet = walletAddress.toLowerCase();

    // Tìm user đã tồn tại
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        lands: {
          include: {
            plant: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found. Please register first.");
    }

    // Login chỉ dựa trên walletAddress,
    // các thông tin profile sẽ được cập nhật qua user/profile API
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
        gold: user.balanceGold,
        ruby: user.balanceRuby,
        landsCount: user.lands.length,
        plantsCount: user.lands.filter((l) => l.plant !== null).length,
      },
    };
  }
}
