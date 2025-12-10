import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient } from "@prisma/client";
import { SeedService } from "../seed/seed.service";
import { MissionService } from "../mission/mission.service";
import { SoulboundTokenService } from "../soulbound-token/soulbound-token.service";

@Injectable()
export class PlantService {
  private readonly logger = new Logger(PlantService.name);

  // Plant type configurations with Vietnamese names
  private readonly PLANT_CONFIGS = {
    ALGAE: {
      name: "Tảo",
      nameVi: "Tảo",
      source: "Shop/Starter",
      diggingHours: 1,
      growingHours: 12,
      totalHours: 13,
      baseYield: 3,
      stages: {
        SEED: { name: "Hạt", nameVi: "Hạt", duration: 0 },
        SPROUT: { name: "Mầm", nameVi: "Mầm", duration: 3 },
        GROWING: { name: "Cây", nameVi: "Cây", duration: 8 },
        BLOOM: { name: "Hoa", nameVi: "Hoa", duration: 12 },
        FRUIT: { name: "Quả", nameVi: "Quả", duration: 13 },
      },
    },
    MUSHROOM: {
      name: "Nấm",
      nameVi: "Nấm",
      source: "Craft (5 Tảo)",
      diggingHours: 10,
      growingHours: 72,
      totalHours: 82,
      baseYield: 5,
      craftCost: { ALGAE: 5 },
      stages: {
        SEED: { name: "Bào tử", nameVi: "Bào tử", duration: 0 },
        SPROUT: { name: "Sợi nấm", nameVi: "Sợi nấm", duration: 10 },
        GROWING: { name: "Thân nấm", nameVi: "Thân nấm", duration: 30 },
        BLOOM: { name: "Nấm trưởng thành", nameVi: "Nấm trưởng thành", duration: 60 },
        FRUIT: { name: "Nấm thu hoạch", nameVi: "Nấm thu hoạch", duration: 82 },
      },
    },
    TREE: {
      name: "Cây",
      nameVi: "Cây",
      source: "NFT Seed",
      diggingHours: 72,
      growingHours: 720,
      totalHours: 792,
      baseYield: 10,
      stages: {
        SEED: { name: "Hạt giống", nameVi: "Hạt giống", duration: 0 },
        SPROUT: { name: "Mầm non", nameVi: "Mầm non", duration: 72 },
        GROWING: { name: "Cây con", nameVi: "Cây con", duration: 240 },
        BLOOM: { name: "Cây ra hoa", nameVi: "Cây ra hoa", duration: 480 },
        FRUIT: { name: "Cây có quả", nameVi: "Cây có quả", duration: 792 },
      },
    },
  };

  // Growth thresholds (hours needed for each stage)
  private readonly STAGE_THRESHOLDS = {
    SEED: 0,
    SPROUT: 3,
    GROWING: 8,
    BLOOM: 12,
    FRUIT: 15,
  };

  // Daily water limit
  private readonly DAILY_WATER_LIMIT = 1;
  private readonly WILT_HOURS = 72;
  private readonly WATER_COOLDOWN_HOURS = 1;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly seedService: SeedService,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
    @Inject(forwardRef(() => SoulboundTokenService))
    private readonly soulboundTokenService: SoulboundTokenService,
  ) {}

  /**
   * Plant a seed - starts in DIGGING phase
   */
  async plantSeed(userId: string, landId: string, seedType: string) {
    const config = this.PLANT_CONFIGS[seedType];
    if (!config) {
      throw new BadRequestException(
        `Invalid seed type. Must be one of: ALGAE, MUSHROOM, TREE`,
      );
    }

    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException("Land not found or does not belong to you");
    }

    if (land.plant) {
      throw new BadRequestException(
        "This land already has a plant. Harvest it first!",
      );
    }

    await this.seedService.consumeSeed(userId, seedType);

    const now = new Date();
    const plant = await this.prisma.plant.create({
      data: {
        landId,
        type: seedType,
        stage: "DIGGING",
        plantedAt: now,
        lastInteractedAt: now,
        diggingStartedAt: now,
        diggingDuration: config.diggingHours,
        growingDuration: config.growingHours,
        diggingCompleted: false,
        interactions: 0,
        waterCount: 0,
      },
      include: { land: true },
    });

    this.logger.log(
      `User ${userId} planted ${seedType} on land ${landId}. Digging: ${config.diggingHours}h`,
    );

    try {
      await this.soulboundTokenService.checkAndIssueBadges(userId);
    } catch (error) {
      this.logger.error(`Failed to check badges: ${error.message}`);
    }

    return {
      plant: {
        id: plant.id,
        type: plant.type,
        stage: plant.stage,
        plantedAt: plant.plantedAt,
      },
      message: `🌱 Successfully planted ${config.nameVi}! Digging phase: ${config.diggingHours} hours`,
      phase: "DIGGING",
      diggingTime: `${config.diggingHours}h`,
      growingTime: `${config.growingHours}h`,
      totalTime: `${config.totalHours}h`,
      note: "⏳ Digging phase completes automatically. Water during GROWING phase to speed up.",
    };
  }

  /**
   * Water a plant (daily limit: 1 per day per user)
   */
  async waterPlant(plantId: string, watererId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    if (plant.stage === "DEAD") {
      throw new BadRequestException("This plant has wilted. It cannot be revived.");
    }

    if (plant.stage === "MATURE") {
      throw new BadRequestException("This plant is ready to harvest!");
    }

    // ✅ Check daily water limit for this user
    const today = this.getToday();
    const lastWaterDate = plant.lastWaterDate ? this.getToday(plant.lastWaterDate) : null;
    const isNewDay = !lastWaterDate || lastWaterDate < today;

    // Reset daily count if new day
    let dailyWaterCount = isNewDay ? 0 : plant.dailyWaterCount;

    if (dailyWaterCount >= this.DAILY_WATER_LIMIT) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      throw new BadRequestException(
        `Daily water limit reached (${this.DAILY_WATER_LIMIT}/day). Next water available at: ${tomorrow.toISOString()}`
      );
    }

    // Check cooldown (1 hour between waters)
    const oneHourAgo = new Date(Date.now() - this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000);
    if (plant.lastInteractedAt > oneHourAgo) {
      const nextWaterTime = new Date(
        plant.lastInteractedAt.getTime() + this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000,
      );
      throw new BadRequestException(
        `This plant was recently watered. Try again after ${nextWaterTime.toISOString()}`,
      );
    }

    const newWaterCount = plant.waterCount + 1;
    const newInteractions = plant.interactions + 1;
    const newDailyWaterCount = dailyWaterCount + 1;
    const oldStage = plant.stage;
    const newStage = this.calculateStageFromWaters(newWaterCount);

    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        waterCount: newWaterCount,
        interactions: newInteractions,
        dailyWaterCount: newDailyWaterCount,
        lastWaterDate: new Date(),
        lastInteractedAt: new Date(),
        stage: newStage,
      },
      include: { land: true },
    });

    try {
      await this.missionService.trackPlantWater(watererId);
    } catch (error) {
      this.logger.error(`Failed to track water mission: ${error.message}`);
    }

    const stageChanged = oldStage !== newStage;
    const nextStageInfo = this.getNextStageInfo(newStage, newWaterCount, plant.type);
    const watersRemainingToday = this.DAILY_WATER_LIMIT - newDailyWaterCount;

    this.logger.log(
      `User ${watererId} watered plant ${plantId} (${oldStage} → ${newStage}, ${newWaterCount} total waters, ${newDailyWaterCount}/${this.DAILY_WATER_LIMIT} today)`,
    );

    return {
      plant: updatedPlant,
      stageChanged,
      oldStage,
      newStage,
      waterCount: newWaterCount,
      interactions: newInteractions,
      dailyProgress: {
        watersUsedToday: newDailyWaterCount,
        watersRemainingToday,
        dailyLimit: this.DAILY_WATER_LIMIT,
        resetsAt: this.getTomorrowMidnight().toISOString(),
      },
      ...nextStageInfo,
      message: stageChanged
        ? `🎉 Plant grew to ${nextStageInfo.currentStageVi} stage! (${watersRemainingToday} waters left today)`
        : `💧 Plant watered! ${nextStageInfo.watersNeeded} more waters to ${nextStageInfo.nextStageVi}. (${watersRemainingToday} waters left today)`,
    };
  }

  /**
   * Get user's garden with detailed plant info
   * ✅ Auto-reset daily water count when fetching garden
   */
  async getGarden(userId: string) {
    const lands = await this.prisma.land.findMany({
      where: { userId },
      include: { plant: true },
      orderBy: { plotIndex: "asc" },
    });

    const now = new Date();
    const today = this.getToday();

    // ✅ Auto-reset daily water counts for all plants if new day
    for (const land of lands) {
      if (land.plant) {
        const lastWaterDate = land.plant.lastWaterDate
          ? this.getToday(land.plant.lastWaterDate)
          : null;
        const isNewDay = !lastWaterDate || lastWaterDate < today;

        if (isNewDay && land.plant.dailyWaterCount > 0) {
          await this.prisma.plant.update({
            where: { id: land.plant.id },
            data: {
              dailyWaterCount: 0,
            },
          });

          // Update local object for response
          land.plant.dailyWaterCount = 0;

          this.logger.log(
            `Reset daily water count for plant ${land.plant.id} (new day: ${today.toISOString()})`,
          );
        }
      }
    }

    return lands.map((land) => {
      if (!land.plant) {
        return {
          landId: land.id,
          plotIndex: land.plotIndex,
          soilQuality: land.soilQuality,
          plant: null,
          status: "EMPTY",
          message: "🌱 This land is ready for planting!",
        };
      }

      const plant = land.plant;
      const config = this.PLANT_CONFIGS[plant.type] || this.PLANT_CONFIGS.ALGAE;

      // Calculate time-based info
      const plantedHoursAgo = (now.getTime() - plant.plantedAt.getTime()) / (1000 * 60 * 60);
      const lastWateredHoursAgo =
        (now.getTime() - plant.lastInteractedAt.getTime()) / (1000 * 60 * 60);

      // Wilt calculation
      const wiltTime = new Date(
        plant.lastInteractedAt.getTime() + this.WILT_HOURS * 60 * 60 * 1000,
      );
      const hoursToWilt = Math.max(0, (wiltTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      const isWilting = hoursToWilt < 24;
      const isCritical = hoursToWilt < 12;
      const isDead = plant.stage === "DEAD" || hoursToWilt <= 0;

      // Water cooldown
      const nextWaterTime = new Date(
        plant.lastInteractedAt.getTime() + this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000,
      );
      const canWaterNow = now >= nextWaterTime && plant.dailyWaterCount < this.DAILY_WATER_LIMIT;
      const watersRemainingToday = Math.max(0, this.DAILY_WATER_LIMIT - plant.dailyWaterCount);

      // Stage info
      const currentStageInfo = config.stages[plant.stage] || config.stages.SEED;
      const nextStageInfo = this.getNextStageInfo(plant.stage, plant.waterCount, plant.type);

      // Digging phase info
      let diggingInfo: {
        phase: string;
        elapsed: number;
        remaining: number;
        total: number;
        progress: number;
        completesAt: string;
        isComplete: boolean;
      } | null = null;

      if (plant.stage === "DIGGING" && plant.diggingStartedAt) {
        const diggingElapsed =
          (now.getTime() - plant.diggingStartedAt.getTime()) / (1000 * 60 * 60);
        const diggingRemaining = Math.max(0, plant.diggingDuration - diggingElapsed);
        const diggingProgress = Math.min(100, (diggingElapsed / plant.diggingDuration) * 100);

        diggingInfo = {
          phase: "DIGGING",
          elapsed: Math.floor(diggingElapsed),
          remaining: Math.ceil(diggingRemaining),
          total: plant.diggingDuration,
          progress: Math.floor(diggingProgress),
          completesAt: new Date(
            plant.diggingStartedAt.getTime() + plant.diggingDuration * 60 * 60 * 1000,
          ).toISOString(),
          isComplete: diggingRemaining <= 0,
        };
      }

      return {
        landId: land.id,
        plotIndex: land.plotIndex,
        soilQuality: land.soilQuality,
        plant: {
          id: plant.id,
          type: plant.type,
          typeName: config.nameVi,
          stage: plant.stage,
          stageName: currentStageInfo.nameVi,
          plantedAt: plant.plantedAt.toISOString(),
          lastWateredAt: plant.lastInteractedAt.toISOString(),
          waterCount: plant.waterCount,
          interactions: plant.interactions,
          age: {
            hours: Math.floor(plantedHoursAgo),
            days: Math.floor(plantedHoursAgo / 24),
          },
          isGoldBranch: plant.isGoldBranch,
        },
        timeline: {
          plantedAt: plant.plantedAt.toISOString(),
          lastWateredAt: plant.lastInteractedAt.toISOString(),
          hoursSincePlanted: Math.floor(plantedHoursAgo),
          hoursSinceLastWater: Math.floor(lastWateredHoursAgo),
          estimatedHarvestAt:
            plant.stage === "MATURE"
              ? "Ready now!"
              : new Date(
                  plant.plantedAt.getTime() + config.totalHours * 60 * 60 * 1000,
                ).toISOString(),
        },
        growth: {
          currentStage: plant.stage,
          currentStageName: currentStageInfo.nameVi,
          nextStage: nextStageInfo.nextStage,
          nextStageName: nextStageInfo.nextStageVi,
          progress: nextStageInfo.progress,
          watersNeeded: nextStageInfo.watersNeeded,
          totalWaters: plant.waterCount,
          waterTarget: nextStageInfo.waterTarget,
        },
        digging: diggingInfo,
        health: {
          status: isDead ? "DEAD" : isCritical ? "CRITICAL" : isWilting ? "WILTING" : "HEALTHY",
          hoursToWilt: isDead ? 0 : Math.floor(hoursToWilt),
          isWilting,
          isCritical,
          wiltTime: isDead ? null : wiltTime.toISOString(),
          message: isDead
            ? "☠️ Plant has wilted and cannot be revived"
            : isCritical
            ? `⚠️ Critical: Plant will wilt in ${Math.floor(hoursToWilt)} hours!`
            : isWilting
            ? `⚠️ Warning: Plant will wilt in ${Math.floor(hoursToWilt)} hours`
            : `💚 Healthy: ${Math.floor(hoursToWilt)} hours until wilt`,
        },
        watering: {
          canWaterNow,
          nextWaterTime: canWaterNow ? null : nextWaterTime.toISOString(),
          cooldownHours: this.WATER_COOLDOWN_HOURS,
          dailyWaterCount: plant.dailyWaterCount,
          dailyWaterLimit: this.DAILY_WATER_LIMIT,
          watersRemainingToday,
          resetsAt: this.getTomorrowMidnight().toISOString(),
        },
        status:
          plant.stage === "MATURE"
            ? "READY_TO_HARVEST"
            : plant.stage === "DEAD"
            ? "DEAD"
            : plant.stage === "DIGGING"
            ? "DIGGING"
            : "GROWING",
      };
    });
  }

  /**
   * Calculate stage from water count
   * Hạt (0) -> Mầm (3) -> Cây (8) -> Hoa (12) -> Quả (15)
   */
  private calculateStageFromWaters(waterCount: number): string {
    if (waterCount >= 15) return "MATURE"; // Ready to harvest
    if (waterCount >= 12) return "BLOOM"; // Hoa
    if (waterCount >= 8) return "GROWING"; // Cây
    if (waterCount >= 3) return "SPROUT"; // Mầm
    return "SEED"; // Hạt
  }

  /**
   * Get next stage info with Vietnamese names
   */
  private getNextStageInfo(currentStage: string, waterCount: number, plantType: string) {
    const config = this.PLANT_CONFIGS[plantType] || this.PLANT_CONFIGS.ALGAE;
    const stages = ["SEED", "SPROUT", "GROWING", "BLOOM", "MATURE"];
    const stageNamesVi = ["Hạt", "Mầm", "Cây", "Hoa", "Quả"];
    const waterTargets = [0, 3, 8, 12, 15];

    const currentIndex = stages.indexOf(currentStage);

    if (currentIndex === stages.length - 1) {
      return {
        currentStage,
        currentStageVi: stageNamesVi[currentIndex],
        nextStage: "HARVEST",
        nextStageVi: "Thu hoạch",
        watersNeeded: 0,
        waterTarget: 15,
        progress: 100,
      };
    }

    const nextIndex = currentIndex + 1;
    const nextStage = stages[nextIndex];
    const waterTarget = waterTargets[nextIndex];
    const watersNeeded = Math.max(0, waterTarget - waterCount);
    const progress = Math.min(100, Math.floor((waterCount / waterTarget) * 100));

    return {
      currentStage,
      currentStageVi: stageNamesVi[currentIndex],
      nextStage,
      nextStageVi: stageNamesVi[nextIndex],
      watersNeeded,
      waterTarget,
      progress,
    };
  }

  /**
   * Harvest mature plant
   */
  async harvestPlant(plantId: string, userId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    if (plant.land.userId !== userId) {
      throw new BadRequestException("You can only harvest your own plants");
    }

    if (plant.stage !== "MATURE") {
      throw new BadRequestException(
        `Plant is not ready to harvest. Current stage: ${plant.stage}. Needs ${15 - plant.waterCount} more waters.`,
      );
    }

    const config = this.PLANT_CONFIGS[plant.type] || this.PLANT_CONFIGS.ALGAE;
    const baseYield = config.baseYield;
    const bonusYield = Math.floor(plant.interactions / 5);
    const totalYield = baseYield + bonusYield;

    await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: { userId, itemType: "FRUIT" },
      },
      create: {
        userId,
        itemType: "FRUIT",
        amount: totalYield,
      },
      update: {
        amount: { increment: totalYield },
      },
    });

    await this.prisma.plant.delete({
      where: { id: plantId },
    });

    try {
      await this.missionService.trackFruitHarvest(userId);
    } catch (error) {
      this.logger.error(`Failed to track harvest mission: ${error.message}`);
    }

    try {
      await this.soulboundTokenService.checkAndIssueBadges(userId);
    } catch (error) {
      this.logger.error(`Failed to check badges: ${error.message}`);
    }

    this.logger.log(`User ${userId} harvested plant ${plantId}, received ${totalYield} fruits`);

    return {
      success: true,
      harvest: {
        fruitYield: totalYield,
        baseYield,
        bonusYield,
        plantType: plant.type,
        plantName: config.nameVi,
        waterCount: plant.waterCount,
        interactions: plant.interactions,
      },
      message: `🎉 Harvested ${totalYield} ${config.nameVi} fruits! Land is now empty and ready for new planting.`,
    };
  }

  /**
   * Interact with plant (legacy method for backward compatibility)
   * @deprecated Use waterPlant instead
   */
  async interactPlant(plantId: string, userId: string, action: string) {
    this.logger.warn(`Legacy interactPlant called. Use waterPlant instead.`);
    
    // For backward compatibility, treat all interactions as watering
    if (action === "visit" || action === "social") {
      return this.waterPlant(plantId, userId);
    }

    throw new BadRequestException(`Unknown interaction action: ${action}`);
  }

  /**
   * Cron job: Auto-progress plants through phases
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoProgressPlants() {
    const plants = await this.prisma.plant.findMany({
      where: {
        stage: { in: ["DIGGING", "GROWING"] },
      },
    });

    for (const plant of plants) {
      await this.checkGrowthCompletion(plant);
    }

    this.logger.log(`Auto-progressed ${plants.length} plants`);
  }

  private formatTimeRemaining(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  }

  /**
   * Get single land info by ID
   */
  async getLandById(landId: string, userId: string) {
    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException("Land not found or does not belong to you");
    }

    const soilQuality = (land.soilQuality as any) || { fertility: 50, hydration: 50 };

    return {
      id: land.id,
      plotIndex: land.plotIndex,
      userId: land.userId,
      soilQuality,
      plant: land.plant ? {
        id: land.plant.id,
        type: land.plant.type,
        stage: land.plant.stage,
        plantedAt: land.plant.plantedAt,
        interactions: land.plant.interactions,
        waterCount: land.plant.waterCount,
        isHarvestable: land.plant.isHarvestable,
      } : null,
      createdAt: land.createdAt,
      updatedAt: land.updatedAt,
    };
  }

  /**
   * Add new land to user's garden
   * Cost: 1000 gold per additional land (plot 1+)
   */
  async addLand(userId: string) {
    // Get current land count
    const existingLands = await this.prisma.land.findMany({
      where: { userId },
      orderBy: { plotIndex: 'desc' },
    });

    const nextPlotIndex = existingLands.length;

    // First land (plot 0) is free, additional lands cost 1000 gold
    if (nextPlotIndex > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { balanceGold: true },
      });

      const landCost = 1000;

      if (!user || user.balanceGold < landCost) {
        throw new BadRequestException(
          `Not enough gold! Need ${landCost} gold to buy land ${nextPlotIndex + 1}. Current balance: ${user?.balanceGold || 0}`
        );
      }

      // Deduct gold
      await this.prisma.user.update({
        where: { id: userId },
        data: { balanceGold: { decrement: landCost } },
      });

      this.logger.log(`User ${userId} purchased land plot ${nextPlotIndex} for ${landCost} gold`);
    }

    // Create new land
    const newLand = await this.prisma.land.create({
      data: {
        userId,
        plotIndex: nextPlotIndex,
        soilQuality: { fertility: 50, hydration: 50 },
      },
    });

    return {
      success: true,
      land: {
        id: newLand.id,
        plotIndex: newLand.plotIndex,
        soilQuality: newLand.soilQuality,
      },
      cost: nextPlotIndex > 0 ? 1000 : 0,
      message: nextPlotIndex === 0 
        ? '🎉 Welcome! Your first land is free!' 
        : `🏞️ Purchased land plot ${nextPlotIndex + 1} for 1000 gold!`,
    };
  }

  /**
   * Remove plant from land (clear land)
   * Useful when plant is dead or user wants to start fresh
   */
  async clearLand(landId: string, userId: string) {
    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException("Land not found or does not belong to you");
    }

    if (!land.plant) {
      throw new BadRequestException("This land is already empty");
    }

    const plantType = land.plant.type;
    const plantStage = land.plant.stage;

    // Delete plant
    await this.prisma.plant.delete({
      where: { id: land.plant.id },
    });

    this.logger.log(`User ${userId} cleared land ${landId}, removed ${plantStage} ${plantType} plant`);

    return {
      success: true,
      land: {
        id: land.id,
        plotIndex: land.plotIndex,
        plant: null,
      },
      removedPlant: {
        type: plantType,
        stage: plantStage,
      },
      message: `🗑️ Cleared land! Removed ${plantStage} ${plantType} plant. Land is now ready for new planting.`,
    };
  }

  /**
   * Get all user lands with summary
   */
  async getUserLands(userId: string) {
    const lands = await this.prisma.land.findMany({
      where: { userId },
      include: { plant: true },
      orderBy: { plotIndex: 'asc' },
    });

    const summary = {
      totalLands: lands.length,
      emptyLands: lands.filter(l => !l.plant).length,
      occupiedLands: lands.filter(l => l.plant).length,
      plantsByStage: lands.reduce((acc, l) => {
        if (l.plant) {
          acc[l.plant.stage] = (acc[l.plant.stage] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      lands: lands.map(land => ({
        id: land.id,
        plotIndex: land.plotIndex,
        soilQuality: land.soilQuality,
        plant: land.plant ? {
          id: land.plant.id,
          type: land.plant.type,
          stage: land.plant.stage,
          interactions: land.plant.interactions,
        } : null,
      })),
      summary,
    };
  }

  /**
   * Check if plant completed digging or growing phase
   */
  private async checkGrowthCompletion(plant: any) {
    const now = new Date();

    // Check digging completion
    if (plant.stage === "DIGGING" && plant.diggingStartedAt) {
      const diggingEndTime = new Date(
        plant.diggingStartedAt.getTime() +
          plant.diggingDuration * 60 * 60 * 1000,
      );

      if (now >= diggingEndTime) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: {
            stage: "GROWING",
            diggingCompleted: true,
            growingStartedAt: now,
          },
        });

        this.logger.log(`Plant ${plant.id} completed digging, now GROWING`);
      }
    }

    // Check growing completion
    if (plant.stage === "GROWING" && plant.growingStartedAt) {
      const growingEndTime = new Date(
        plant.growingStartedAt.getTime() +
          plant.growingDuration * 60 * 60 * 1000,
      );

      if (now >= growingEndTime) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: {
            stage: "MATURE",
            isHarvestable: true,
          },
        });

        this.logger.log(`Plant ${plant.id} is now MATURE and harvestable`);
      }
    }
  }

  /**
   * Check and update wilted plants
   */
  async checkWiltStatus() {
    const now = new Date();

    // Find wilted plants
    const wiltedPlants = await this.prisma.plant.findMany({
      where: {
        stage: "GROWING",
        lastInteractedAt: {
          lt: new Date(now.getTime() - this.WILT_HOURS * 60 * 60 * 1000),
        },
      },
    });

    for (const plant of wiltedPlants) {
      // Update plant to DEAD stage
      await this.prisma.plant.update({
        where: { id: plant.id },
        data: { stage: "DEAD" },
      });

      this.logger.log(`Plant ${plant.id} has wilted and is now DEAD`);
    }

    return {
      wiltedCount: wiltedPlants.length,
      message: `Checked ${wiltedPlants.length} plants for wilt status`,
    };
  }

  /**
   * Helper: Get today's date at midnight (for daily reset)
   */
  private getToday(date?: Date): Date {
    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Helper: Get tomorrow's midnight (for reset time display)
   */
  private getTomorrowMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
