import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient
  ) {}

  async register(dto: RegisterDto) {
    const { walletAddress, username } = dto;
    const wallet = walletAddress.toLowerCase();

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (existingUser) {
      throw new ConflictException(
        "User with this wallet address already exists"
      );
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: { username },
      });

      if (existingUsername) {
        throw new ConflictException("Username already taken");
      }
    }

    // ✅ Create user with 1 empty land (no plant)
    const user = await this.prisma.user.create({
      data: {
        walletAddress: wallet,
        username: username || null,
        xp: 0,
        reputationScore: 0,
        balanceGold: 0,
        balanceRuby: 0,
        avatar: null,
        // ✅ Create 1 empty land (plot 0) - no plant
        lands: {
          create: {
            plotIndex: 0,
            soilQuality: { fertility: 50, hydration: 50 },
            // ✅ No plant created - land is empty
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

    this.logger.log(`New user registered: ${user.id} (${wallet})`);

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
        landsCount: user.lands.length, // Will be 1
        plantsCount: user.lands.filter((l) => l.plant !== null).length, // Will be 0
      },
    };
  }

  async login(dto: LoginDto) {
    const { walletAddress } = dto;
    const wallet = walletAddress.toLowerCase();

    // Find existing user
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
