import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// Internal config types for rewards
interface LevelRewardItem {
  type: string;
  amount: number;
}

interface LevelConfig {
  level: number;
  requiredXp: number;
  rewards: {
    items?: LevelRewardItem[];
    // Sau có thể mở rộng thêm: badges, reputation, v.v.
  };
}

@Injectable()
export class ProgressionService {
  // Định nghĩa bảng XP → Level cơ bản
  private readonly LEVEL_CONFIGS: LevelConfig[] = [
    { level: 1, requiredXp: 0, rewards: {} },
    // Để dễ test MVP, level 2 yêu cầu 20 XP (có thể đạt được bằng cách claim 1 daily mission)
    {
      level: 2,
      requiredXp: 20,
      rewards: { items: [{ type: "SEED_COMMON", amount: 1 }] },
    },
    {
      level: 3,
      requiredXp: 250,
      rewards: { items: [{ type: "FERTILIZER_BASIC", amount: 1 }] },
    },
    {
      level: 4,
      requiredXp: 500,
      rewards: { items: [{ type: "SEED_RARE", amount: 1 }] },
    },
    {
      level: 5,
      requiredXp: 800,
      rewards: { items: [{ type: "FERTILIZER_PRO", amount: 1 }] },
    },
    { level: 6, requiredXp: 1200, rewards: {} },
    {
      level: 7,
      requiredXp: 1700,
      rewards: { items: [{ type: "SEED_EPIC", amount: 1 }] },
    },
    { level: 8, requiredXp: 2300, rewards: {} },
    {
      level: 9,
      requiredXp: 3000,
      rewards: { items: [{ type: "FERTILIZER_ELITE", amount: 1 }] },
    },
    {
      level: 10,
      requiredXp: 3800,
      rewards: { items: [{ type: "SEED_LEGENDARY", amount: 1 }] },
    },
  ];

  constructor(private readonly prisma: PrismaClient) { }

  private getLevelConfig(level: number): LevelConfig | undefined {
    return this.LEVEL_CONFIGS.find((cfg) => cfg.level === level);
  }

  public getCurrentLevelFromXp(xp: number): LevelConfig {
    // Lấy config level cao nhất mà requiredXp <= xp
    let current = this.LEVEL_CONFIGS[0];
    for (const cfg of this.LEVEL_CONFIGS) {
      if (xp >= cfg.requiredXp && cfg.requiredXp >= current.requiredXp) {
        current = cfg;
      }
    }
    return current;
  }

  async getUserProgress(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const currentLevelConfig = this.getCurrentLevelFromXp(user.xp);
    const maxConfig = this.LEVEL_CONFIGS[this.LEVEL_CONFIGS.length - 1];

    // Tìm next level config (level cao hơn đầu tiên)
    const nextLevelConfig =
      this.LEVEL_CONFIGS.find(
        (cfg) => cfg.requiredXp > currentLevelConfig.requiredXp,
      ) ?? maxConfig;

    const nextLevelXp = nextLevelConfig.requiredXp;
    const xpToNextLevel = Math.max(0, nextLevelXp - user.xp);

    return {
      xp: user.xp,
      level: currentLevelConfig.level,
      nextLevelXp,
      xpToNextLevel,
      levels: this.LEVEL_CONFIGS.map((cfg) => ({
        level: cfg.level,
        requiredXp: cfg.requiredXp,
        rewards: cfg.rewards,
        // MVP: chưa lưu trạng thái claimed trong DB, FE có thể tự disable theo logic riêng
        claimed: false,
        reachable: user.xp >= cfg.requiredXp,
      })),
    };
  }

  async claimLevelReward(userId: string, level: number): Promise<any> {
    const levelConfig = this.getLevelConfig(level);
    if (!levelConfig) {
      throw new BadRequestException("Invalid level");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.xp < levelConfig.requiredXp) {
      throw new BadRequestException("Not enough XP to claim this level reward");
    }

    // Áp dụng phần thưởng items (nếu có)
    if (levelConfig.rewards.items) {
      for (const item of levelConfig.rewards.items) {
        await this.prisma.inventoryItem.upsert({
          where: {
            userId_itemType: { userId, itemType: item.type },
          },
          create: {
            userId,
            itemType: item.type,
            amount: item.amount,
          },
          update: {
            amount: { increment: item.amount },
          },
        });
      }
    }

    // MVP: chưa lưu trạng thái claimed theo level trong DB
    // Trả lại progression mới nhất sau khi trao thưởng
    return this.getUserProgress(userId);
  }
}
