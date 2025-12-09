import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryService } from "../inventory/inventory.service";
import {
  STREAK_REWARDS,
  MAX_STREAK_DAYS,
  STREAK_EXPIRY_HOURS,
  STREAK_RESET_HOURS,
} from "./constants/rewards";
import {
  CheckinResponseDto,
  StreakStatusDto,
  CheckinHistoryDto,
  RewardDto,
  ItemRewardDto,
} from "./dto/streak-response.dto";

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventoryService: InventoryService
  ) {}

  canCheckinNow(lastCheckinAt: Date | null, currentStreak: number): boolean {
    if (!lastCheckinAt) return true;

    const now = new Date();
    const hoursSinceLastCheckin =
      (now.getTime() - lastCheckinAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastCheckin >= STREAK_EXPIRY_HOURS;
  }

  shouldResetStreak(lastCheckinAt: Date | null): boolean {
    if (!lastCheckinAt) return false;

    const now = new Date();
    const hoursSinceLastCheckin =
      (now.getTime() - lastCheckinAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastCheckin > STREAK_RESET_HOURS;
  }

  getNextCheckinTime(lastCheckinAt: Date | null): Date | null {
    if (!lastCheckinAt) return null;

    const nextCheckin = new Date(lastCheckinAt);
    nextCheckin.setHours(nextCheckin.getHours() + STREAK_EXPIRY_HOURS);
    return nextCheckin;
  }

  /**
   * Get item metadata for Vietnamese rewards
   * ✅ UPDATED: Added new item types
   */
  private getItemMetadata(itemType: string) {
    const ITEM_METADATA: Record<
      string,
      { name: string; rarity: string; icon: string }
    > = {
      // Seeds
      SEED_COMMON: { name: "Hạt Giống Thường", rarity: "COMMON", icon: "🌱" },
      SEED_RARE: { name: "Hạt Giống Hiếm", rarity: "RARE", icon: "🌿" },
      SEED_EPIC: { name: "Hạt Giống Sử Thi", rarity: "EPIC", icon: "🌳" },
      SEED_LEGENDARY: { name: "Hạt Giống Huyền Thoại", rarity: "LEGENDARY", icon: "🌲" },
      SEED_ALGAE: { name: "Mầm Tảo", rarity: "COMMON", icon: "🌿" },
      SEED_MUSHROOM: { name: "Bào Tử Nấm", rarity: "RARE", icon: "🍄" },
      SEED_TREE: { name: "Hạt Cây", rarity: "EPIC", icon: "🌳" },

      // Fertilizers
      FERTILIZER_COMMON: { name: "Phân Bón Thường", rarity: "COMMON", icon: "💩" },
      FERTILIZER_RARE: { name: "Phân Bón Hiếm", rarity: "RARE", icon: "✨" },
      FERTILIZER_EPIC: { name: "Phân Bón Sử Thi", rarity: "EPIC", icon: "💫" },
      FERTILIZER_LEGENDARY: { name: "Phân Bón Huyền Thoại", rarity: "LEGENDARY", icon: "⭐" },

      // ✅ NEW: Vietnamese streak rewards
      BUG_GLOVE: { name: "Găng Tay Bắt Sâu", rarity: "COMMON", icon: "🧤" },
      PESTICIDE: { name: "Thuốc Trừ Sâu", rarity: "COMMON", icon: "🧪" },
      GEM: { name: "Gem", rarity: "RARE", icon: "💎" },
      GOLD: { name: "Vàng", rarity: "COMMON", icon: "🪙" },

      // Event rewards
      EVENT_TICKET: { name: "Vé Sự Kiện", rarity: "RARE", icon: "🎫" },
      REWARD_BOX: { name: "Hộp Quà", rarity: "EPIC", icon: "🎁" },
    };

    return (
      ITEM_METADATA[itemType] || {
        name: itemType,
        rarity: "COMMON",
        icon: "📦",
      }
    );
  }

  calculateRewards(streakDay: number): RewardDto {
    const reward = STREAK_REWARDS[streakDay];
    if (!reward) {
      throw new BadRequestException(`Invalid streak day: ${streakDay}`);
    }

    const enrichedItems: ItemRewardDto[] = reward.items.map((item) => {
      const metadata = this.getItemMetadata(item.itemType);
      return {
        ...item,
        ...metadata,
      };
    });

    return {
      gold: reward.gold,
      ruby: reward.ruby,
      items: enrichedItems,
    };
  }

  async getStreakStatus(userId: string): Promise<StreakStatusDto> {
    let streak = await this.prisma.dailyStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.dailyStreak.create({
        data: { userId },
      });
    }

    const canCheckin = this.canCheckinNow(
      streak.lastCheckinAt,
      streak.currentStreak
    );
    const nextCheckinAt = this.getNextCheckinTime(streak.lastCheckinAt);

    const nextStreakDay =
      streak.currentStreak === MAX_STREAK_DAYS ? 1 : streak.currentStreak + 1;
    const nextRewards = this.calculateRewards(nextStreakDay);

    const daysUntilCycleComplete =
      streak.currentStreak === 0
        ? MAX_STREAK_DAYS
        : MAX_STREAK_DAYS - streak.currentStreak;

    return {
      currentStreak: streak.currentStreak,
      lastCheckinAt: streak.lastCheckinAt,
      nextCheckinAt,
      totalCycles: streak.totalCycles,
      canCheckinNow: canCheckin,
      nextRewards,
      daysUntilCycleComplete,
    };
  }

  async distributeRewards(userId: string, rewards: RewardDto): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (rewards.gold > 0 || rewards.ruby > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              balanceGold: { increment: rewards.gold },
              balanceRuby: { increment: rewards.ruby },
            },
          });
        }

        for (let i = 0; i < rewards.items.length; i++) {
          const item = rewards.items[i];
          await this.inventoryService.addItem(userId, {
            itemType: item.itemType,
            amount: item.amount,
          });
        }
      });

      this.logger.log(
        `Distributed rewards to user ${userId}: ${rewards.gold} gold, ${rewards.ruby} ruby, ${rewards.items.length} items`
      );
    } catch (error) {
      this.logger.error(
        `Failed to distribute rewards to user ${userId}`,
        error
      );
      throw new BadRequestException("Failed to distribute rewards");
    }
  }

  async validateCheckin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const streak = await this.prisma.dailyStreak.findUnique({
      where: { userId },
    });

    if (streak && streak.lastCheckinAt) {
      const canCheckin = this.canCheckinNow(
        streak.lastCheckinAt,
        streak.currentStreak
      );

      if (!canCheckin) {
        const nextCheckinAt = this.getNextCheckinTime(streak.lastCheckinAt);
        throw new BadRequestException({
          message: "Already checked in today",
          nextCheckinAt,
        });
      }
    }
  }

  /**
   * Perform daily check-in
   * ✅ LOGIC: Resets to Day 1 if user completes Day 7
   */
  async performCheckin(userId: string): Promise<CheckinResponseDto> {
    await this.validateCheckin(userId);

    let streak = await this.prisma.dailyStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      streak = await this.prisma.dailyStreak.create({
        data: { userId },
      });
    }

    const needsReset = this.shouldResetStreak(streak.lastCheckinAt);
    let newStreak = streak.currentStreak;

    if (needsReset) {
      newStreak = 0;
      this.logger.log(`Resetting expired streak for user ${userId}`);
    }

    newStreak = newStreak + 1;

    let newTotalCycles = streak.totalCycles;
    if (newStreak > MAX_STREAK_DAYS) {
      // ✅ FIXED: Complete cycle, reset to Day 1
      newStreak = 1; // Start new cycle from Day 1
      newTotalCycles += 1;
      this.logger.log(`User ${userId} completed streak cycle ${newTotalCycles}!`);
    }

    const streakDay = newStreak;
    const rewards = this.calculateRewards(streakDay);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedStreak = await tx.dailyStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          lastCheckinAt: new Date(),
          totalCycles: newTotalCycles,
        },
      });

      await tx.streakCheckin.create({
        data: {
          userId,
          streakDay,
          rewards: rewards as any,
        },
      });

      await this.distributeRewards(userId, rewards);

      return updatedStreak;
    });

    const nextCheckinAt = this.getNextCheckinTime(result.lastCheckinAt);

    // ✅ UPDATED: Vietnamese message with day name
    const dayNames = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
    const dayName = dayNames[streakDay];

    return {
      success: true,
      streakDay,
      currentStreak: result.currentStreak,
      totalCycles: result.totalCycles,
      rewards,
      nextCheckinAt,
      message: `✅ Điểm danh thành công! ${dayName} (Ngày ${streakDay}/7)`,
    };
  }

  async getCheckinHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<CheckinHistoryDto> {
    const skip = (page - 1) * limit;

    const total = await this.prisma.streakCheckin.count({
      where: { userId },
    });

    const checkins = await this.prisma.streakCheckin.findMany({
      where: { userId },
      orderBy: { checkinAt: "desc" },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      checkins: checkins.map((checkin) => ({
        id: checkin.id,
        streakDay: checkin.streakDay,
        rewards: checkin.rewards as any,
        checkinAt: checkin.checkinAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async resetExpiredStreaks(): Promise<number> {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() - STREAK_EXPIRY_HOURS);

    try {
      const expiredStreaks = await this.prisma.dailyStreak.findMany({
        where: {
          lastCheckinAt: {
            lt: expiryTime,
          },
          currentStreak: {
            gt: 0,
          },
        },
        take: 100,
      });

      let resetCount = 0;

      for (let i = 0; i < expiredStreaks.length; i++) {
        const streak = expiredStreaks[i];
        try {
          await this.prisma.dailyStreak.update({
            where: { id: streak.id },
            data: {
              currentStreak: 0,
            },
          });
          resetCount++;
        } catch (error) {
          this.logger.error(
            `Failed to reset streak for user ${streak.userId}`,
            error
          );
        }
      }

      if (resetCount > 0) {
        this.logger.log(`Reset ${resetCount} expired streaks`);
      }

      return resetCount;
    } catch (error) {
      this.logger.error("Failed to reset expired streaks", error);
      return 0;
    }
  }
}
