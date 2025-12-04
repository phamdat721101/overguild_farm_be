import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SoulboundTokenService } from '../soulbound-token/soulbound-token.service';

// ✅ Define enums locally (instead of importing from Prisma)
export enum MissionType {
  DAILY_CHECKIN = 'DAILY_CHECKIN',
  WATER_PLANTS = 'WATER_PLANTS',
  HARVEST_FRUITS = 'HARVEST_FRUITS',
  PLANT_SEEDS = 'PLANT_SEEDS',
  SOCIAL_INTERACT = 'SOCIAL_INTERACT',
  HIDDEN_NIGHTOWL = 'HIDDEN_NIGHTOWL',
  HIDDEN_EARLYBIRD = 'HIDDEN_EARLYBIRD',
}

export enum MissionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
}

interface MissionConfig {
  type: MissionType;
  name: string;
  description: string;
  target: number;
  reward: {
    xp?: number;
    reputation?: number;
    items?: Array<{ type: string; amount: number }>;
  };
  resetPeriod: 'daily' | 'weekly' | 'permanent';
}

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  // Mission configurations
  private readonly MISSION_CONFIGS: Record<MissionType, MissionConfig> = {
    [MissionType.DAILY_CHECKIN]: {
      type: MissionType.DAILY_CHECKIN,
      name: 'Daily Check-in',
      description: 'Check in to 1 event today',
      target: 1,
      reward: { 
        xp: 10, 
        reputation: 5, 
        items: [
          { type: 'SEED_COMMON', amount: 1 },
          { type: 'WATER', amount: 3 },
        ] 
      },
      resetPeriod: 'daily',
    },
    [MissionType.WATER_PLANTS]: {
      type: MissionType.WATER_PLANTS,
      name: 'Green Thumb',
      description: 'Water 5 plants',
      target: 5,
      reward: { xp: 20, reputation: 10, items: [{ type: 'FERTILIZER_COMMON', amount: 1 }] },
      resetPeriod: 'daily',
    },
    [MissionType.HARVEST_FRUITS]: {
      type: MissionType.HARVEST_FRUITS,
      name: 'Bountiful Harvest',
      description: 'Harvest 3 plants',
      target: 3,
      reward: { xp: 30, reputation: 15, items: [{ type: 'SEED_RARE', amount: 1 }] },
      resetPeriod: 'daily',
    },
    [MissionType.PLANT_SEEDS]: {
      type: MissionType.PLANT_SEEDS,
      name: 'Planter',
      description: 'Plant 2 seeds',
      target: 2,
      reward: { xp: 15, reputation: 8 },
      resetPeriod: 'daily',
    },
    [MissionType.SOCIAL_INTERACT]: {
      type: MissionType.SOCIAL_INTERACT,
      name: 'Social Butterfly',
      description: 'Interact with 10 plants',
      target: 10,
      reward: { xp: 25, reputation: 12 },
      resetPeriod: 'weekly',
    },
    // ✅ Add missing hidden missions
    [MissionType.HIDDEN_NIGHTOWL]: {
      type: MissionType.HIDDEN_NIGHTOWL,
      name: 'Night Owl',
      description: 'Check in to events between 10 PM and 2 AM',
      target: 3,
      reward: { 
        xp: 50, 
        reputation: 20, 
        items: [{ type: 'SEED_EPIC', amount: 1 }] 
      },
      resetPeriod: 'permanent',
    },
    [MissionType.HIDDEN_EARLYBIRD]: {
      type: MissionType.HIDDEN_EARLYBIRD,
      name: 'Early Bird',
      description: 'Check in to events before 10 AM',
      target: 5,
      reward: { 
        xp: 40, 
        reputation: 15, 
        items: [{ type: 'SEED_RARE', amount: 2 }] 
      },
      resetPeriod: 'permanent',
    },
  };

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(forwardRef(() => SoulboundTokenService))
    private readonly soulboundTokenService: SoulboundTokenService,
  ) {}

  /**
   * Initialize daily missions for a user
   */
  async initializeDailyMissions(userId: string) {
    const dailyMissions = [
      MissionType.DAILY_CHECKIN, 
      MissionType.WATER_PLANTS, 
      MissionType.HARVEST_FRUITS, 
      MissionType.PLANT_SEEDS
    ];

    for (const missionType of dailyMissions) {
      const config = this.MISSION_CONFIGS[missionType];
      
      const existing = await this.prisma.mission.findFirst({
        where: {
          userId,
          missionType,
          status: { in: [MissionStatus.ACTIVE, MissionStatus.COMPLETED] },
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
    await this.initializeDailyMissions(userId);

    const missions = await this.prisma.mission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return missions.map(mission => {
      const config = this.MISSION_CONFIGS[mission.missionType as MissionType];
      return {
        id: mission.id,
        type: mission.missionType,
        name: config?.name || mission.missionType,
        description: config?.description || '',
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
  async updateProgress(userId: string, missionType: MissionType, increment: number = 1) {
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
    const mission = await this.prisma.mission.findFirst({
      where: { id: missionId, userId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException('Mission is not completed yet');
    }

    const config = this.MISSION_CONFIGS[mission.missionType as MissionType];

    // Update user XP and reputation
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: config.reward.xp || 0 },
        reputationScore: { increment: config.reward.reputation || 0 },
      },
    });

    // Give item rewards
    if (config.reward.items) {
      for (const item of config.reward.items) {
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

    // Update mission status
    const updatedMission = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.CLAIMED },
    });

    // Create mission log
    await this.prisma.missionLog.create({
      data: {
        userId,
        missionType: mission.missionType,
        target: config.target,
        status: MissionStatus.CLAIMED,
      },
    });

    this.logger.log(`User ${userId} claimed mission ${mission.missionType}`);

    await this.soulboundTokenService.checkAndIssueBadges(userId).catch(() => {});

    return {
      success: true,
      mission: updatedMission,
      rewards: {
        xp: config.reward.xp,
        reputation: config.reward.reputation,
        items: config.reward.items,
      },
      message: `🎉 Mission completed! Received ${config.reward.xp} XP, ${config.reward.reputation} reputation${config.reward.items ? `, and items: ${config.reward.items.map(i => `${i.amount}x ${i.type}`).join(', ')}` : ''}`,
    };
  }

  /**
   * Track event check-in
   */
  async trackEventCheckIn(userId: string, checkInTime: Date) {
    const hour = checkInTime.getHours();

    await this.updateProgress(userId, MissionType.DAILY_CHECKIN, 1);

    // Hidden missions
    if (hour >= 22 || hour <= 2) {
      await this.updateProgress(userId, MissionType.HIDDEN_NIGHTOWL, 1);
    } else if (hour < 10) {
      await this.updateProgress(userId, MissionType.HIDDEN_EARLYBIRD, 1);
    }
  }

  /**
   * Track plant watering
   */
  async trackPlantWater(userId: string) {
    await this.updateProgress(userId, MissionType.WATER_PLANTS, 1);
  }

  /**
   * Track fruit harvest
   */
  async trackFruitHarvest(userId: string) {
    await this.updateProgress(userId, MissionType.HARVEST_FRUITS, 1);
  }
}

