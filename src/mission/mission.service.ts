import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { SoulboundTokenService } from "../soulbound-token/soulbound-token.service";

export enum MissionType {
  DAILY_CHECKIN = "DAILY_CHECKIN",
  DAILY_WATER = "DAILY_WATER",
  WEEKLY_HARVEST = "WEEKLY_HARVEST",
  HIDDEN_NIGHTOWL = "HIDDEN_NIGHTOWL",
  HIDDEN_EARLYBIRD = "HIDDEN_EARLYBIRD",
}

export enum MissionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CLAIMED = "claimed",
}

interface MissionConfig {
  type: MissionType;
  name: string;
  description: string;
  target: number;
  reward: {
    xp: number;
    reputation: number;
    items?: { type: string; amount: number }[];
  };
  resetPeriod?: "daily" | "weekly" | "never";
}

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  // Mission configurations
  private readonly MISSION_CONFIGS: Record<MissionType, MissionConfig> = {
    [MissionType.DAILY_CHECKIN]: {
      type: MissionType.DAILY_CHECKIN,
      name: "Daily Check-in",
      description: "Check in to 1 event today",
      target: 1,
      reward: {
        xp: 10,
        reputation: 5,
        items: [{ type: "WATER", amount: 1 }],
      },
      resetPeriod: "daily",
    },
    [MissionType.DAILY_WATER]: {
      type: MissionType.DAILY_WATER,
      name: "Social Sprinkler",
      description: "Water 3 plants today",
      target: 3,
      reward: { xp: 20, reputation: 10 },
      resetPeriod: "daily",
    },
    [MissionType.WEEKLY_HARVEST]: {
      type: MissionType.WEEKLY_HARVEST,
      name: "Weekly Harvest",
      description: "Harvest 5 fruits this week",
      target: 5,
      reward: {
        xp: 100,
        reputation: 50,
        items: [{ type: "SEED_RARE", amount: 1 }],
      },
      resetPeriod: "weekly",
    },
    [MissionType.HIDDEN_NIGHTOWL]: {
      type: MissionType.HIDDEN_NIGHTOWL,
      name: "Night Owl",
      description: "Check in to an event between 10 PM - 2 AM",
      target: 1,
      reward: {
        xp: 50,
        reputation: 25,
        items: [{ type: "SEED_RARE", amount: 1 }],
      },
      resetPeriod: "never",
    },
    [MissionType.HIDDEN_EARLYBIRD]: {
      type: MissionType.HIDDEN_EARLYBIRD,
      name: "Early Bird",
      description: "Check in to an event before 10 AM",
      target: 1,
      reward: {
        xp: 50,
        reputation: 25,
        items: [{ type: "SEED_RARE", amount: 1 }],
      },
      resetPeriod: "never",
    },
  };

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(forwardRef(() => SoulboundTokenService))
    private readonly soulboundTokenService: SoulboundTokenService
  ) { }

  /**
   * Initialize daily missions for a user
   */
  async initializeDailyMissions(userId: string) {
    const dailyMissions = [MissionType.DAILY_CHECKIN, MissionType.DAILY_WATER];

    for (const missionType of dailyMissions) {
      const config = this.MISSION_CONFIGS[missionType];

      // Check if mission already exists
      const existing = await this.prisma.mission.findFirst({
        where: {
          userId,
          missionType,
          status: { in: ["active", "completed"] },
        },
      });

      if (!existing) {
        await this.prisma.mission.create({
          data: {
            userId,
            missionType,
            target: config.target,
            progress: 0,
            status: MissionStatus.ACTIVE,
          },
        });
        this.logger.log(`Initialized ${missionType} for user ${userId}`);
      }
    }
  }

  /**
   * Get all missions for a user
   */
  async getUserMissions(userId: string) {
    // Initialize daily missions if not exist
    await this.initializeDailyMissions(userId);

    const missions = await this.prisma.mission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return missions.map((mission) => {
      const config = this.MISSION_CONFIGS[mission.missionType as MissionType];
      return {
        id: mission.id,
        type: mission.missionType,
        name: config?.name || mission.missionType,
        description: config?.description || "",
        progress: mission.progress,
        target: mission.target,
        status: mission.status,
        reward: config?.reward,
        resetPeriod: config?.resetPeriod,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
      };
    });
  }

  /**
   * Update mission progress
   */
  async updateProgress(
    userId: string,
    missionType: MissionType,
    increment: number = 1
  ) {
    const mission = await this.prisma.mission.findFirst({
      where: {
        userId,
        missionType,
        status: MissionStatus.ACTIVE,
      },
    });

    if (!mission) {
      this.logger.warn(`Mission ${missionType} not found for user ${userId}`);
      return null;
    }

    const newProgress = mission.progress + increment;
    const isCompleted = newProgress >= mission.target;

    const updated = await this.prisma.mission.update({
      where: { id: mission.id },
      data: {
        progress: newProgress,
        status: isCompleted ? MissionStatus.COMPLETED : MissionStatus.ACTIVE,
      },
    });

    if (isCompleted) {
      this.logger.log(`Mission ${missionType} completed for user ${userId}`);
    }

    return updated;
  }

  /**
   * Claim mission rewards
   */
  async claimReward(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException("Mission not found");
    }

    if (mission.userId !== userId) {
      throw new BadRequestException("Mission does not belong to this user");
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException("Mission is not completed yet");
    }

    const config = this.MISSION_CONFIGS[mission.missionType as MissionType];
    if (!config) {
      throw new BadRequestException("Invalid mission type");
    }

    // Update user XP and reputation
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: config.reward.xp },
        reputationScore: { increment: config.reward.reputation },
      },
    });

    // Add item rewards
    if (config.reward.items) {
      for (const item of config.reward.items) {
        const existingItem = await this.prisma.inventoryItem.findUnique({
          where: {
            userId_itemType_location: { userId, itemType: item.type, location: "STORAGE" },
          },
        });

        if (existingItem) {
          await this.prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: { amount: { increment: item.amount } },
          });
        } else {
          await this.prisma.inventoryItem.create({
            data: {
              userId,
              itemType: item.type,
              amount: item.amount,
            },
          });
        }
      }
    }

    // Mark mission as claimed
    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.CLAIMED },
    });

    // Log to mission_logs
    await this.prisma.missionLog.create({
      data: {
        userId,
        missionType: mission.missionType,
        progress: mission.progress,
        target: mission.target,
        status: MissionStatus.CLAIMED,
      },
    });

    // Reset daily/weekly missions
    if (config.resetPeriod === "daily" || config.resetPeriod === "weekly") {
      await this.prisma.mission.delete({
        where: { id: missionId },
      });
      this.logger.log(
        `Deleted ${config.resetPeriod} mission ${mission.missionType} for user ${userId}`
      );
    }

    this.logger.log(
      `User ${userId} claimed reward for mission ${mission.missionType}`
    );

    // Check and issue badges (mission-related)
    try {
      await this.soulboundTokenService.checkAndIssueBadges(userId);
    } catch (error) {
      this.logger.error(`Failed to check badges: ${error.message}`);
    }

    return {
      success: true,
      mission: {
        id: updatedMission.id,
        type: updatedMission.missionType,
        name: config.name,
      },
      rewards: {
        xp: config.reward.xp,
        reputation: config.reward.reputation,
        items: config.reward.items || [],
      },
    };
  }

  /**
   * Track event check-in for missions
   */
  async trackEventCheckIn(userId: string, checkInTime: Date) {
    const hour = checkInTime.getHours();

    // Update DAILY_CHECKIN mission
    await this.updateProgress(userId, MissionType.DAILY_CHECKIN, 1);

    // Check for hidden missions
    if (hour >= 22 || hour <= 2) {
      // Night Owl (10 PM - 2 AM)
      await this.updateProgress(userId, MissionType.HIDDEN_NIGHTOWL, 1);
    } else if (hour < 10) {
      // Early Bird (before 10 AM)
      await this.updateProgress(userId, MissionType.HIDDEN_EARLYBIRD, 1);
    }
  }

  /**
   * Track plant watering for missions
   */
  async trackPlantWater(userId: string) {
    await this.updateProgress(userId, MissionType.DAILY_WATER, 1);
  }

  /**
   * Track fruit harvest for missions
   */
  async trackFruitHarvest(userId: string) {
    await this.updateProgress(userId, MissionType.WEEKLY_HARVEST, 1);
  }
}
