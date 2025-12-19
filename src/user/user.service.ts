import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { AddCurrencyDto, CurrencyType } from "./dto/add-currency.dto";

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
        balanceGold: true,
        balanceGem: true,
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
        balanceGold: true,
        balanceGem: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Add or subtract currency from user balance
   * Positive amount = add, Negative amount = subtract
   */
  async addCurrency(userId: string, dto: AddCurrencyDto) {
    // Map currency type to field name
    const fieldMap: Record<CurrencyType, string> = {
      [CurrencyType.GOLD]: "balanceGold",
      [CurrencyType.GEM]: "balanceGem",
    };

    const field = fieldMap[dto.currency];

    // Get current balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { [field]: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const currentBalance = (user as any)[field] || 0;
    const newBalance = currentBalance + dto.amount;

    // Prevent negative balance
    if (newBalance < 0) {
      throw new BadRequestException(
        `Insufficient ${dto.currency}. Current: ${currentBalance}, Requested: ${dto.amount}`
      );
    }

    // Update balance
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { [field]: newBalance },
      select: {
        id: true,
        balanceGold: true,
        balanceGem: true,
      },
    });

    return {
      success: true,
      currency: dto.currency,
      previousBalance: currentBalance,
      amount: dto.amount,
      newBalance: newBalance,
      balances: {
        gold: updated.balanceGold,
        gem: updated.balanceGem,
      },
    };
  }
}
