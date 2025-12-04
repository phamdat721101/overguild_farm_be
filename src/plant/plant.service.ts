import { Injectable, BadRequestException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { SeedService } from '../seed/seed.service';
import { MissionService } from '../mission/mission.service';
import { SoulboundTokenService } from '../soulbound-token/soulbound-token.service';

@Injectable()
export class PlantService {
  private readonly logger = new Logger(PlantService.name);

  // ✅ FIXED: Correct growth times according to spec
  private readonly PLANT_CONFIGS = {
    ALGAE: {
      name: 'Tảo (Algae)',
      source: 'Shop/Starter',
      bucketRequired: 1,
      diggingHours: 0, // ✅ No digging for Algae
      growingHours: 12, // ✅ Direct 12h growth
      totalHours: 12, // ✅ Fixed: 12h total (not 13h)
      baseYield: 3,
      stages: [
        { name: 'GROWING', duration: 12 }, // Skip DIGGING phase
      ],
    },
    MUSHROOM: {
      name: 'Nấm (Mushroom)',
      source: 'Craft (5 Algae)',
      bucketRequired: 1,
      diggingHours: 0, // ✅ No digging for Mushroom
      growingHours: 72, // ✅ Direct 72h growth
      totalHours: 72, // ✅ Fixed: 72h total (not 82h)
      baseYield: 5,
      craftCost: { FRUIT_ALGAE: 5 },
      stages: [
        { name: 'GROWING', duration: 72 }, // Skip DIGGING phase
      ],
    },
    TREE: {
      name: 'Cây (Tree)',
      source: 'NFT Seed (F0-F3)',
      bucketRequired: 1,
      diggingHours: 72, // Hạt → Mầm (3 days)
      growingHours: 648, // Mầm → Cây (5d) + Cây → Hoa (7d) + Hoa → Quả (15d) = 27 days
      totalHours: 720, // 30 days total
      baseYield: 10,
      stages: [
        { name: 'DIGGING', duration: 72 }, // Hạt → Mầm (3 days)
        { name: 'SPROUT', duration: 120 }, // Mầm → Cây (5 days)
        { name: 'TREE', duration: 168 },   // Cây → Ra Hoa (7 days)
        { name: 'FLOWER', duration: 360 }, // Hoa → Ra Quả (15 days)
      ],
    },
    // Legacy types for backward compatibility
    SOCIAL: {
      name: 'Social Plant',
      source: 'Starter',
      bucketRequired: 1,
      diggingHours: 0,
      growingHours: 12,
      totalHours: 12,
      baseYield: 3,
      stages: [{ name: 'GROWING', duration: 12 }],
    },
    TECH: {
      name: 'Tech Plant',
      source: 'Starter',
      bucketRequired: 1,
      diggingHours: 0,
      growingHours: 12,
      totalHours: 12,
      baseYield: 3,
      stages: [{ name: 'GROWING', duration: 12 }],
    },
    CREATIVE: {
      name: 'Creative Plant',
      source: 'Starter',
      bucketRequired: 1,
      diggingHours: 0,
      growingHours: 12,
      totalHours: 12,
      baseYield: 3,
      stages: [{ name: 'GROWING', duration: 12 }],
    },
    BUSINESS: {
      name: 'Business Plant',
      source: 'Starter',
      bucketRequired: 1,
      diggingHours: 0,
      growingHours: 12,
      totalHours: 12,
      baseYield: 3,
      stages: [{ name: 'GROWING', duration: 12 }],
    },
  };

  private readonly WILT_HOURS = 72;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly seedService: SeedService,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
    @Inject(forwardRef(() => SoulboundTokenService))
    private readonly soulboundTokenService: SoulboundTokenService,
  ) {}

  /**
   * ✅ FIXED: Plant seed with correct phase detection
   */
  async plantSeed(userId: string, landId: string, seedType: string) {
    const config = this.PLANT_CONFIGS[seedType];
    if (!config) {
      throw new BadRequestException(`Invalid seed type. Available: ${Object.keys(this.PLANT_CONFIGS).join(', ')}`);
    }

    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException('Land not found');
    }

    if (land.plant) {
      throw new BadRequestException('Land already has a plant. Harvest it first!');
    }

    // Check bucket requirement
    const bucket = await this.prisma.inventoryItem.findUnique({
      where: { userId_itemType: { userId, itemType: 'BUCKET' } },
    });

    if (!bucket || bucket.amount < config.bucketRequired) {
      throw new BadRequestException(`You need ${config.bucketRequired} bucket(s) to plant ${config.name}`);
    }

    await this.prisma.inventoryItem.update({
      where: { id: bucket.id },
      data: { amount: { decrement: config.bucketRequired } },
    });

    await this.seedService.consumeSeed(userId, seedType);

    const now = new Date();
    
    // ✅ FIXED: Determine initial stage based on plant type
    const initialStage = config.diggingHours > 0 ? 'DIGGING' : 'GROWING';
    const diggingStartedAt = config.diggingHours > 0 ? now : null;
    const growingStartedAt = config.diggingHours === 0 ? now : null;

    const plant = await this.prisma.plant.create({
      data: {
        landId,
        type: seedType,
        stage: initialStage,
        plantedAt: now,
        lastInteractedAt: now,
        diggingStartedAt,
        diggingDuration: config.diggingHours,
        growingDuration: config.growingHours,
        diggingCompleted: config.diggingHours === 0,
        growingStartedAt,
        interactions: 0,
        waterCount: 0,
        githubCommits: 0,
        isGoldBranch: false,
      },
      include: { land: true },
    });

    this.logger.log(
      `User ${userId} planted ${seedType} on land ${landId}. ` +
      `Initial stage: ${initialStage}, Total time: ${config.totalHours}h`
    );

    await this.soulboundTokenService.checkAndIssueBadges(userId).catch(() => {});

    return {
      plant,
      message: config.diggingHours > 0
        ? `🌱 Planted ${config.name}! Digging phase: ${config.diggingHours}h`
        : `🌱 Planted ${config.name}! Growing for ${config.growingHours}h`,
      phase: initialStage,
      totalTime: `${config.totalHours}h`,
      harvestTime: new Date(now.getTime() + config.totalHours * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Water a plant (only during GROWING phase)
   */
  async waterPlant(plantId: string, watererId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    if (plant.stage === 'DIGGING') {
      throw new BadRequestException('Cannot water during digging phase. Wait for sprout to appear.');
    }

    if (plant.stage === 'MATURE') {
      throw new BadRequestException('Plant is ready to harvest!');
    }

    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        waterCount: { increment: 1 },
        interactions: { increment: 1 },
        lastInteractedAt: new Date(),
      },
    });

    await this.checkGrowthProgression(updatedPlant);
    await this.missionService.trackPlantWater(watererId).catch(() => {});

    return {
      plant: updatedPlant,
      message: '💧 Plant watered successfully!',
      waterCount: updatedPlant.waterCount,
    };
  }

  /**
   * ✅ IMPROVED: Auto-progression with correct stage transitions
   */
  private async checkGrowthProgression(plant: any) {
    const now = new Date();
    const config = this.PLANT_CONFIGS[plant.type];

    // Check digging completion (only for TREE)
    if (plant.stage === 'DIGGING' && plant.diggingStartedAt) {
      const diggingEndTime = new Date(
        plant.diggingStartedAt.getTime() + plant.diggingDuration * 60 * 60 * 1000
      );

      if (now >= diggingEndTime) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: {
            stage: 'SPROUT',
            diggingCompleted: true,
            growingStartedAt: now,
          },
        });
        this.logger.log(`Plant ${plant.id} (${plant.type}) completed digging → SPROUT`);
        return;
      }
    }

    // TREE sub-stages progression
    if (plant.type === 'TREE' && plant.growingStartedAt) {
      const elapsed = (now.getTime() - plant.growingStartedAt.getTime()) / (1000 * 60 * 60);
      
      let newStage = plant.stage;
      
      // Calculate exact transition points
      if (elapsed >= 480 && plant.stage === 'FLOWER') {
        newStage = 'MATURE'; // 120 + 168 + 360 = 648h from SPROUT start, but we measure from growingStartedAt
      } else if (elapsed >= 288 && plant.stage === 'TREE') {
        newStage = 'FLOWER'; // 120 + 168 = 288h from SPROUT start
      } else if (elapsed >= 120 && plant.stage === 'SPROUT') {
        newStage = 'TREE'; // 120h (5 days) from SPROUT start
      }

      if (newStage !== plant.stage) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: { stage: newStage },
        });
        this.logger.log(`Plant ${plant.id} progressed: ${plant.stage} → ${newStage}`);
      }
      return;
    }

    // Simple plants (ALGAE, MUSHROOM, legacy) - direct to MATURE
    if (plant.stage === 'GROWING' && plant.growingStartedAt) {
      const growingEndTime = new Date(
        plant.growingStartedAt.getTime() + plant.growingDuration * 60 * 60 * 1000
      );

      if (now >= growingEndTime) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: { stage: 'MATURE' },
        });
        this.logger.log(`Plant ${plant.id} is now MATURE and ready to harvest!`);
      }
    }
  }

  /**
   * ✅ HARVEST: Claims fruits and stores in inventory
   */
  async harvestPlant(plantId: string, userId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant || plant.land.userId !== userId) {
      throw new NotFoundException('Plant not found or not owned by you');
    }

    // ✅ Strict MATURE check
    if (plant.stage !== 'MATURE') {
      const config = this.PLANT_CONFIGS[plant.type];
      const timeRemaining = this.calculateTimeRemaining(plant);
      
      throw new BadRequestException(
        `Plant not ready to harvest. Current stage: ${plant.stage}. ` +
        `Time remaining: ${timeRemaining}. Total growth time: ${config.totalHours}h`
      );
    }

    const config = this.PLANT_CONFIGS[plant.type];
    const baseYield = config.baseYield;
    const bonusYield = Math.floor(plant.waterCount * 0.5); // 0.5 bonus per water
    const totalYield = baseYield + bonusYield;

    // Determine fruit type based on plant type
    const fruitType = plant.type === 'ALGAE' ? 'FRUIT_ALGAE' : 
                     plant.type === 'MUSHROOM' ? 'FRUIT_MUSHROOM' : 
                     plant.type === 'TREE' ? 'FRUIT_TREE' : 'FRUIT';

    // ✅ Store fruits in inventory (auto-claim)
    await this.prisma.inventoryItem.upsert({
      where: { userId_itemType: { userId, itemType: fruitType } },
      create: { userId, itemType: fruitType, amount: totalYield },
      update: { amount: { increment: totalYield } },
    });

    // Delete plant to free the land
    await this.prisma.plant.delete({ where: { id: plantId } });

    this.logger.log(
      `User ${userId} harvested plant ${plantId} (${plant.type}). ` +
      `Received ${totalYield} ${fruitType} (base: ${baseYield}, bonus: ${bonusYield})`
    );

    await this.missionService.trackFruitHarvest(userId).catch(() => {});
    await this.soulboundTokenService.checkAndIssueBadges(userId).catch(() => {});

    return {
      success: true,
      harvest: {
        plantType: plant.type,
        plantName: config.name,
        fruitType,
        fruitYield: totalYield,
        baseYield,
        bonusYield,
        waterCount: plant.waterCount,
        plantedAt: plant.plantedAt,
        harvestedAt: new Date(),
        growthDuration: this.calculateGrowthDuration(plant),
      },
      message: `🎉 Harvested ${totalYield}x ${fruitType}! Land is now empty.`,
      nextAction: 'Plant a new seed to continue farming! 🌱',
    };
  }

  /**
   * Get garden with accurate time-based progress
   */
  async getGarden(userId: string) {
    const lands = await this.prisma.land.findMany({
      where: { userId },
      include: { plant: true },
      orderBy: { plotIndex: 'asc' },
    });

    const now = new Date();

    return lands.map(land => {
      if (!land.plant) {
        return {
          landId: land.id,
          plotIndex: land.plotIndex,
          plant: null,
          status: 'EMPTY',
          message: '🌾 Land is ready for planting!',
        };
      }

      const plant = land.plant;
      const config = this.PLANT_CONFIGS[plant.type] || this.PLANT_CONFIGS.SOCIAL;

      let progress = 0;
      let timeRemaining = '';
      let currentPhase = plant.stage;

      // Calculate progress
      if (plant.stage === 'DIGGING' && plant.diggingStartedAt) {
        const endTime = new Date(
          plant.diggingStartedAt.getTime() + plant.diggingDuration * 60 * 60 * 1000
        );
        const elapsed = now.getTime() - plant.diggingStartedAt.getTime();
        const total = plant.diggingDuration * 60 * 60 * 1000;
        progress = Math.min(100, Math.floor((elapsed / total) * 100));
        timeRemaining = this.formatTimeRemaining(Math.max(0, endTime.getTime() - now.getTime()));
      } else if (plant.growingStartedAt) {
        const elapsed = now.getTime() - plant.growingStartedAt.getTime();
        const total = plant.growingDuration * 60 * 60 * 1000;
        progress = Math.min(100, Math.floor((elapsed / total) * 100));
        const remaining = Math.max(0, total - elapsed);
        timeRemaining = this.formatTimeRemaining(remaining);
      }

      const isHarvestable = plant.stage === 'MATURE';

      return {
        landId: land.id,
        plotIndex: land.plotIndex,
        plant: {
          id: plant.id,
          type: plant.type,
          name: config.name,
          stage: plant.stage,
          plantedAt: plant.plantedAt,
          waterCount: plant.waterCount,
          interactions: plant.interactions,
        },
        progress: {
          percentage: progress,
          timeRemaining,
          currentPhase,
          canWater: plant.stage !== 'DIGGING' && plant.stage !== 'MATURE',
          isHarvestable,
        },
        config: {
          totalTime: `${config.totalHours}h`,
          baseYield: config.baseYield,
          bonusPerWater: 0.5,
        },
        message: isHarvestable 
          ? `🎉 Ready to harvest! Expected yield: ${config.baseYield + Math.floor(plant.waterCount * 0.5)}` 
          : `⏳ ${timeRemaining} until ready`,
      };
    });
  }

  /**
   * Cron: Auto-progress plants every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoProgressPlants() {
    const plants = await this.prisma.plant.findMany({
      where: { stage: { in: ['DIGGING', 'GROWING', 'SPROUT', 'TREE', 'FLOWER'] } },
    });

    for (const plant of plants) {
      await this.checkGrowthProgression(plant);
    }

    this.logger.log(`Auto-progressed ${plants.length} plants`);
  }

  /**
   * Cron: Check wilt status
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkWiltStatus() {
    const wiltThreshold = new Date(Date.now() - this.WILT_HOURS * 60 * 60 * 1000);

    const result = await this.prisma.plant.updateMany({
      where: {
        lastInteractedAt: { lt: wiltThreshold },
        stage: { notIn: ['DEAD', 'MATURE', 'DIGGING'] },
      },
      data: { stage: 'DEAD' },
    });

    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} plants as DEAD due to no watering for 72h`);
    }

    return result;
  }

  private formatTimeRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private calculateTimeRemaining(plant: any): string {
    const now = new Date();
    const config = this.PLANT_CONFIGS[plant.type];
    
    if (plant.stage === 'DIGGING' && plant.diggingStartedAt) {
      const endTime = new Date(
        plant.diggingStartedAt.getTime() + plant.diggingDuration * 60 * 60 * 1000
      );
      return this.formatTimeRemaining(Math.max(0, endTime.getTime() - now.getTime()));
    }
    
    if (plant.growingStartedAt) {
      const endTime = new Date(
        plant.growingStartedAt.getTime() + plant.growingDuration * 60 * 60 * 1000
      );
      return this.formatTimeRemaining(Math.max(0, endTime.getTime() - now.getTime()));
    }
    
    return 'Unknown';
  }

  private calculateGrowthDuration(plant: any): string {
    const start = plant.plantedAt;
    const end = new Date();
    const duration = end.getTime() - start.getTime();
    return this.formatTimeRemaining(duration);
  }

  async interactPlant(plantId: string, userId: string, action: 'visit' | 'social') {
    return this.waterPlant(plantId, userId);
  }
}