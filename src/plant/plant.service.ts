import { Injectable, BadRequestException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SeedService } from '../seed/seed.service';
import { MissionService } from '../mission/mission.service';

@Injectable()
export class PlantService {
  private readonly logger = new Logger(PlantService.name);

  // Growth thresholds (interactions needed)
  private readonly STAGE_THRESHOLDS = {
    SEED: 0,
    SPROUT: 3,    // 3 waters to sprout
    BLOOM: 8,     // 8 total waters to bloom
    FRUIT: 15,    // 15 total waters to fruit
  };

  private readonly WILT_HOURS = 72;
  private readonly WATER_COOLDOWN_HOURS = 0; // Disabled for MVP testing (set to 1 for production)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly seedService: SeedService,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
  ) {}

  /**
   * Plant a seed on a land plot
   */
  async plantSeed(userId: string, landId: string, seedType: string) {
    // Validate land ownership
    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException('Land not found or does not belong to you');
    }

    if (land.plant) {
      throw new BadRequestException('This land already has a plant. Harvest it first!');
    }

    // Consume seed from inventory (will throw if not enough)
    await this.seedService.consumeSeed(userId, seedType);

    // Create plant
    const plant = await this.prisma.plant.create({
      data: {
        landId,
        type: seedType,
        stage: 'SEED',
        plantedAt: new Date(),
        lastInteractedAt: new Date(),
        interactions: 0,
        githubCommits: 0,
        isGoldBranch: false,
      },
      include: {
        land: true,
      },
    });

    this.logger.log(`User ${userId} planted ${seedType} on land ${landId}`);

    return {
      plant,
      message: `Successfully planted ${seedType} seed!`,
      nextStage: 'SPROUT',
      interactionsNeeded: this.STAGE_THRESHOLDS.SPROUT,
    };
  }

  /**
   * Water a plant (social feature)
   * - Updates lastInteractedAt for plant owner
   * - Increments interactions count
   * - Checks for growth stage upgrade
   * - Tracks mission progress
   * - Rate limit: 1 water per hour per plant
   */
  async waterPlant(plantId: string, watererId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    if (plant.stage === 'DEAD') {
      throw new BadRequestException('This plant has wilted. It cannot be revived.');
    }

    if (plant.stage === 'FRUIT') {
      throw new BadRequestException('This plant is ready to harvest! Water it after harvesting.');
    }

    // Check rate limit: Can't water same plant within 1 hour
    const oneHourAgo = new Date(Date.now() - this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000);
    if (plant.lastInteractedAt > oneHourAgo) {
      const nextWaterTime = new Date(plant.lastInteractedAt.getTime() + this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000);
      throw new BadRequestException(
        `This plant was recently watered. Try again after ${nextWaterTime.toISOString()}`
      );
    }

    // Update plant
    const newInteractions = plant.interactions + 1;
    const oldStage = plant.stage;
    const newStage = this.calculateStage(newInteractions);

    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        interactions: newInteractions,
        lastInteractedAt: new Date(),
        stage: newStage,
      },
      include: {
        land: true,
      },
    });

    // Track mission progress for waterer
    try {
      await this.missionService.trackPlantWater(watererId);
    } catch (error) {
      this.logger.error(`Failed to track water mission: ${error.message}`);
    }

    const stageChanged = oldStage !== newStage;
    const nextStageInfo = this.getNextStageInfo(newStage, newInteractions);

    this.logger.log(
      `User ${watererId} watered plant ${plantId} (${oldStage} → ${newStage}, ${newInteractions} interactions)`
    );

    return {
      plant: updatedPlant,
      stageChanged,
      oldStage,
      newStage,
      interactions: newInteractions,
      ...nextStageInfo,
      message: stageChanged 
        ? `🎉 Plant grew to ${newStage} stage!` 
        : `Plant watered! ${nextStageInfo.interactionsNeeded} more waters to ${nextStageInfo.nextStage}`,
    };
  }

  /**
   * Calculate plant stage based on interactions
   */
  private calculateStage(interactions: number): string {
    if (interactions >= this.STAGE_THRESHOLDS.FRUIT) return 'FRUIT';
    if (interactions >= this.STAGE_THRESHOLDS.BLOOM) return 'BLOOM';
    if (interactions >= this.STAGE_THRESHOLDS.SPROUT) return 'SPROUT';
    return 'SEED';
  }

  /**
   * Get next stage info for UI
   */
  private getNextStageInfo(currentStage: string, interactions: number) {
    const stages = ['SEED', 'SPROUT', 'BLOOM', 'FRUIT'];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex === stages.length - 1) {
      return {
        nextStage: 'HARVEST',
        interactionsNeeded: 0,
        progress: 100,
      };
    }

    const nextStage = stages[currentIndex + 1];
    const nextThreshold = this.STAGE_THRESHOLDS[nextStage];
    const interactionsNeeded = nextThreshold - interactions;
    const progress = Math.floor((interactions / nextThreshold) * 100);

    return {
      nextStage,
      interactionsNeeded,
      progress,
    };
  }

  async interactPlant(plantId: string, userId: string, action: 'visit' | 'social') {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant || plant.land.userId !== userId) {
      throw new NotFoundException('Plant not found');
    }

    // Simple interaction for MVP
    return this.prisma.plant.update({
      where: { id: plantId },
      data: {
        interactions: { increment: 1 },
        lastInteractedAt: new Date(),
      },
    });
  }

  /**
   * Harvest a plant that reached FRUIT stage
   */
  async harvestPlant(plantId: string, userId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    if (plant.land.userId !== userId) {
      throw new BadRequestException('You can only harvest your own plants');
    }

    if (plant.stage !== 'FRUIT') {
      throw new BadRequestException(
        `Plant is not ready to harvest. Current stage: ${plant.stage}. Needs ${this.STAGE_THRESHOLDS.FRUIT - plant.interactions} more waters.`
      );
    }

    // Calculate fruit yield (base 3 + bonus for interactions)
    const baseYield = 3;
    const bonusYield = Math.floor(plant.interactions / 5); // +1 fruit per 5 interactions
    const totalYield = baseYield + bonusYield;

    // Add fruits to inventory
    await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: { userId, itemType: 'FRUIT' },
      },
      create: {
        userId,
        itemType: 'FRUIT',
        amount: totalYield,
      },
      update: {
        amount: { increment: totalYield },
      },
    });

    // Delete plant (clear the land)
    await this.prisma.plant.delete({
      where: { id: plantId },
    });

    // Track mission progress
    try {
      await this.missionService.trackFruitHarvest(userId);
    } catch (error) {
      this.logger.error(`Failed to track harvest mission: ${error.message}`);
    }

    this.logger.log(`User ${userId} harvested plant ${plantId}, received ${totalYield} fruits`);

    return {
      success: true,
      harvest: {
        fruitYield: totalYield,
        baseYield,
        bonusYield,
        plantType: plant.type,
        interactions: plant.interactions,
      },
      message: `🎉 Harvested ${totalYield} fruits! Land is now empty and ready for a new seed.`,
    };
  }

  /**
   * Get user's garden (all plants with growth info)
   */
  async getGarden(userId: string) {
    const lands = await this.prisma.land.findMany({
      where: { userId },
      include: {
        plant: true,
      },
      orderBy: { plotIndex: 'asc' },
    });

    const now = new Date();

    return lands.map(land => {
      if (!land.plant) {
        return {
          landId: land.id,
          plotIndex: land.plotIndex,
          soilQuality: land.soilQuality,
          plant: null,
          status: 'EMPTY',
          message: 'This land is ready for planting!',
        };
      }

      const plant = land.plant;
      const nextStageInfo = this.getNextStageInfo(plant.stage, plant.interactions);
      
      // Calculate time to wilt
      const wiltTime = new Date(plant.lastInteractedAt.getTime() + this.WILT_HOURS * 60 * 60 * 1000);
      const hoursToWilt = Math.max(0, (wiltTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      const isWilting = hoursToWilt < 24; // Warning if less than 24h

      // Calculate next water time
      const nextWaterTime = new Date(plant.lastInteractedAt.getTime() + this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000);
      const canWaterNow = now >= nextWaterTime;

      return {
        landId: land.id,
        plotIndex: land.plotIndex,
        soilQuality: land.soilQuality,
        plant: {
          id: plant.id,
          type: plant.type,
          stage: plant.stage,
          interactions: plant.interactions,
          plantedAt: plant.plantedAt,
          lastInteractedAt: plant.lastInteractedAt,
          age: Math.floor((now.getTime() - plant.plantedAt.getTime()) / (1000 * 60 * 60 * 24)), // days
          isGoldBranch: plant.isGoldBranch,
        },
        growth: {
          currentStage: plant.stage,
          nextStage: nextStageInfo.nextStage,
          progress: nextStageInfo.progress,
          interactionsNeeded: nextStageInfo.interactionsNeeded,
        },
        health: {
          status: plant.stage === 'DEAD' ? 'DEAD' : isWilting ? 'WILTING' : 'HEALTHY',
          hoursToWilt: plant.stage === 'DEAD' ? 0 : Math.floor(hoursToWilt),
          isWilting,
        },
        watering: {
          canWaterNow,
          nextWaterTime: canWaterNow ? null : nextWaterTime,
        },
        status: plant.stage === 'FRUIT' ? 'READY_TO_HARVEST' : plant.stage === 'DEAD' ? 'DEAD' : 'GROWING',
      };
    });
  }

  /**
   * Cron job: Check and mark wilted plants as DEAD
   */
  async checkWiltStatus() {
    const wiltThreshold = new Date(Date.now() - this.WILT_HOURS * 60 * 60 * 1000);

    const result = await this.prisma.plant.updateMany({
      where: {
        lastInteractedAt: { lt: wiltThreshold },
        stage: { not: 'DEAD' },
      },
      data: { stage: 'DEAD' },
    });

    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} plants as DEAD due to 72h inactivity`);
    }

    return result;
  }
}