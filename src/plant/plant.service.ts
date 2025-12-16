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
import { InventoryService } from "../inventory/inventory.service";
import {
  PLANT_CONFIGS,
  PLANT_CONSTANTS,
  STAGE_THRESHOLDS,
} from "../common/constants/game-config.constant";
import { ITEM_TYPES } from "../inventory/constants/item-types";

@Injectable()
export class PlantService {
  private readonly logger = new Logger(PlantService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly seedService: SeedService,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
    @Inject(forwardRef(() => SoulboundTokenService))
    private readonly soulboundTokenService: SoulboundTokenService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
  ) { }

  /**
   * Plant a seed - starts in DIGGING phase
   * ✅ UPDATED: Set lastInteractedAt to past time to allow immediate first water
   */
  async plantSeed(userId: string, landId: string, seedType: string) {
    const config = PLANT_CONFIGS[seedType];
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

    // ✅ KEY CHANGE: Set lastInteractedAt to (now - cooldown) to bypass first water cooldown
    const initialLastInteracted = new Date(
      now.getTime() - (PLANT_CONSTANTS.WATER_COOLDOWN_HOURS * 60 * 60 * 1000)
    );

    const plant = await this.prisma.plant.create({
      data: {
        landId,
        type: seedType,
        stage: "DIGGING",
        plantedAt: now,
        lastInteractedAt: initialLastInteracted, // ✅ Set to past time
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
      `User ${userId} planted ${seedType} on land ${landId}. First water available immediately.`,
    );

    try {
      await this.soulboundTokenService.checkAndIssueBadges(userId);

      // ✅ REFERRAL BONUS CHECK
      // Invite friend (Friend finishes planting Algae) -> Receive 5 Drops (Only applicable in first 72h of account opening).
      // Assuming "ALGAE" is the type string.
      if (seedType === "ALGAE") {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, createdAt: true, referrerId: true },
        });

        if (user && user.referrerId) {
          const nowMs = new Date().getTime();
          const joinedMs = user.createdAt.getTime();
          const hoursSinceJoin = (nowMs - joinedMs) / (1000 * 60 * 60);

          if (hoursSinceJoin <= 72) {
            // Give 5 Water to Referrer
            await this.inventoryService.addItem(user.referrerId, {
              itemType: ITEM_TYPES.WATER,
              amount: 5
            });
            this.logger.log(`Referral Bonus: User ${userId} planted Algae. Sent 5 Water to referrer ${user.referrerId}`);
          }
        }
      }

    } catch (error) {
      this.logger.error(`Failed to process side effects (badges/referrals): ${error.message}`);
    }

    return {
      plant: {
        id: plant.id,
        type: plant.type,
        stage: plant.stage,
        plantedAt: plant.plantedAt,
      },
      message: `🌱 Successfully planted ${config.nameVi}! You can water it immediately.`,
      phase: "DIGGING",
      diggingTime: `${config.diggingHours}h`,
      growingTime: `${config.growingHours}h`,
      totalTime: `${config.totalHours}h`,
      canWaterNow: true, // ✅ Indicate immediate watering available
      note: "💧 Water now to start growth tracking!",
    };
  }

  /**
   * Water a plant (Consumes 1 WATER item = +3 Growth Hours)
   * ✅ NEW LOGIC:
   * - Requires "WATER" item in inventory.
   * - Adds 3 hours to `waterBalance`.
   * - Clears `witheredAt` if plant was withering.
   * - No daily limit on applying water (can stack).
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
      throw new BadRequestException("This plant has died. You must clear the land to plant again.");
    }

    if (plant.stage === "MATURE") {
      throw new BadRequestException("This plant is ready to harvest!");
    }

    // Check ownership (only owner can water for now, or maybe friends?)
    if (plant.land.userId !== watererId) {
      // For now, allow friend watering if implemented? Strict ownership for simplicity first.
      // throw new BadRequestException("You can only water your own plants");
    }

    // Check if user has WATER item
    const hasWater = await this.inventoryService.hasItemAmount(watererId, ITEM_TYPES.WATER, 1);
    if (!hasWater) {
      throw new BadRequestException("You don't have any Water Drops! Get more from The Well.");
    }

    // Consume WATER item
    await this.inventoryService.removeItem(watererId, {
      itemType: ITEM_TYPES.WATER,
      amount: 1,
    });

    // Update Plant
    // 1 Drop = 3 Hours
    const WATER_VALUE_HOURS = 3;

    // If plant was withering (waterBalance <= 0), this revives it.
    // We clear witheredAt.

    const newWaterBalance = Math.max(0, plant.waterBalance) + WATER_VALUE_HOURS;
    const newWaterCount = plant.waterCount + 1;
    const newInteractions = plant.interactions + 1;

    // Calculate generic stage (visual mostly, as logic is now activeGrowthHours based)
    // But we still track waterCount for legacy/achievements
    const newStage = this.calculateStageFromWaters(newWaterCount); // Keep legacy stage calc for now or update?
    // Actually, stage should depend on activeGrowthHours now. 
    // But `calculateStageFromWaters` is based on counts. 
    // Let's rely on Cron to update Stage based on hours. 
    // But we can update stats here.

    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        waterBalance: newWaterBalance,
        witheredAt: null, // Clear withering status
        waterCount: newWaterCount,
        interactions: newInteractions,
        lastInteractedAt: new Date(),
        lastWateredAt: new Date(),
        // waterBy: ... (add user to list)
      },
      include: { land: true },
    });

    try {
      await this.missionService.trackPlantWater(watererId);
    } catch (error) {
      this.logger.error(`Failed to track water mission: ${error.message}`);
    }

    this.logger.log(
      `User ${watererId} watered plant ${plantId}. Balance: ${newWaterBalance}h.`,
    );

    return {
      plant: updatedPlant,
      message: `💧 Added 3 hours of hydration! Plant is healthy. (Balance: ${newWaterBalance}h)`,
      waterBalance: newWaterBalance,
      withered: false,
    };
  }

  /**
   * Get user's garden with detailed plant info
   * ✅ OPTIMIZED: Batch update daily water counts to eliminate N+1 queries
   */
  /**
   * Get user's garden with detailed plant info
   * ✅ OPTIMIZED: Hydration System View
   */
  async getGarden(userId: string) {
    const lands = await this.prisma.land.findMany({
      where: { userId },
      include: { plant: true },
      orderBy: { plotIndex: "asc" },
    });

    const now = new Date();

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
      const config = PLANT_CONFIGS[plant.type] || PLANT_CONFIGS.ALGAE;

      // Hydration Check
      // We calculate predicted changes since last Cron to give real-time feel?
      // For simplicity, we stick to DB values updated by Cron/Actions.
      // But maybe we can show "Time until dry"?

      const waterBalance = plant.waterBalance; // Hours
      const isWithering = waterBalance <= 0;
      const witheredAt = plant.witheredAt;
      let hoursToDeath = 0;
      let isDead = plant.stage === "DEAD";

      if (isDead) {
        hoursToDeath = 0;
      } else if (isWithering && witheredAt) {
        // Death in 72h from witheredAt
        const deathTime = new Date(witheredAt.getTime() + 72 * 60 * 60 * 1000);
        const msToDeath = deathTime.getTime() - now.getTime();
        hoursToDeath = Math.max(0, Math.floor(msToDeath / (1000 * 60 * 60)));

        if (msToDeath <= 0) {
          isDead = true; // Technically should be updated by Cron, but display logic here
        }
      } else {
        // Healthy
        hoursToDeath = 72; // Default safe buffer or N/A
      }

      const activeGrowthHours = plant.activeGrowthHours;
      const totalHoursNeeded = config.totalHours;
      const progress = Math.min(100, Math.floor((activeGrowthHours / totalHoursNeeded) * 100));

      // Calculate anticipated harvest time if maintained healthy
      const hoursRemaining = Math.max(0, totalHoursNeeded - activeGrowthHours);

      const currentStageInfo = config.stages[plant.stage] || config.stages.SEED;

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
          lastWateredAt: plant.lastWateredAt ? plant.lastWateredAt.toISOString() : null,
          waterBalance: plant.waterBalance,
        },
        hydration: {
          status: isDead ? "DEAD" : isWithering ? "WITHERING" : "HEALTHY",
          waterBalance: plant.waterBalance, // Hours of water left
          message: isDead
            ? "☠️ Plant died."
            : isWithering
              ? `⚠️ Withering! Dies in ~${hoursToDeath}h if not watered.`
              : `💧 Hydrated (${plant.waterBalance}h remaining).`,
          isDead,
          isWithering,
          hoursToDeath: isDead ? 0 : hoursToDeath,
        },
        growth: {
          activeGrowthHours: plant.activeGrowthHours,
          totalHoursNeeded: config.totalHours,
          progress: progress,
          hoursRemaining: hoursRemaining,
          currentStage: plant.stage,
        },
        status: plant.stage === "MATURE" ? "READY_TO_HARVEST" : isDead ? "DEAD" : "GROWING",
      };
    });
  }

  /**
   * Calculate stage from water count
   * Hạt (0) -> Mầm (3) -> Cây (8) -> Hoa (12) -> Quả (15)
   */
  private calculateStageFromWaters(waterCount: number): string {
    if (waterCount >= STAGE_THRESHOLDS.FRUIT) return "MATURE"; // Ready to harvest
    if (waterCount >= STAGE_THRESHOLDS.BLOOM) return "BLOOM"; // Hoa
    if (waterCount >= STAGE_THRESHOLDS.GROWING) return "GROWING"; // Cây
    if (waterCount >= STAGE_THRESHOLDS.SPROUT) return "SPROUT"; // Mầm
    return "SEED"; // Hạt
  }

  /**
   * Get next stage info with Vietnamese names
   */
  private getNextStageInfo(currentStage: string, waterCount: number, plantType: string) {
    const config = PLANT_CONFIGS[plantType] || PLANT_CONFIGS.ALGAE;
    const stages = ["SEED", "SPROUT", "GROWING", "BLOOM", "MATURE"];
    const stageNamesVi = ["Hạt", "Mầm", "Cây", "Hoa", "Quả"];
    const waterTargets = [
      STAGE_THRESHOLDS.SEED,
      STAGE_THRESHOLDS.SPROUT,
      STAGE_THRESHOLDS.GROWING,
      STAGE_THRESHOLDS.BLOOM,
      STAGE_THRESHOLDS.FRUIT
    ];

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

    const config = PLANT_CONFIGS[plant.type] || PLANT_CONFIGS.ALGAE;
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
  /**
   * Cron job: Auto-progress plants (Hourly)
   * ✅ NEW LOGIC:
   * 1. Consume 1 Hour of Water Balance.
   * 2. If Water Balance > 0 -> Add 1 Hour to Active Growth.
   * 3. If Water Balance <= 0 -> Mark witheredAt if not set.
   * 4. Check Death: If witheredAt + 72h < now -> Kill plant (Burn).
   * 5. Check Stage Upgrades based on Active Growth Hours.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoProgressPlants() {
    const plants = await this.prisma.plant.findMany({
      where: {
        stage: { notIn: ["DEAD", "MATURE"] },
      },
    });

    const now = new Date();
    let updatedCount = 0;

    for (const plant of plants) {
      let { waterBalance, activeGrowthHours, witheredAt, stage } = plant;
      let updates: any = {};
      let stateChanged = false;

      // 1. Consume Water logic
      if (waterBalance > 0) {
        waterBalance -= 1;
        activeGrowthHours += 1;
        updates.waterBalance = waterBalance;
        updates.activeGrowthHours = activeGrowthHours;
        stateChanged = true;

        // Ensure witheredAt is cleared if it was set (should be cleared on water, but safety check)
        if (witheredAt) {
          updates.witheredAt = null;
          witheredAt = null;
        }

        // Check Growth/Stage Logic
        const newStage = this.calculateStageFromHours(activeGrowthHours, plant.type);
        if (newStage && newStage !== stage) {
          updates.stage = newStage;
          if (newStage === "MATURE") {
            updates.isHarvestable = true;
          }
        }

      } else {
        // Plant is drying/withered
        if (!witheredAt) {
          updates.witheredAt = now; // Start withering now
          witheredAt = now;
          stateChanged = true;
        } else {
          // Check Death
          const deathTime = new Date(witheredAt.getTime() + 72 * 60 * 60 * 1000);
          if (now > deathTime) {
            updates.stage = "DEAD";
            updates.fruitYield = 0; // Burn potential yield
            stateChanged = true;
            this.logger.log(`Plant ${plant.id} died due to lack of water.`);
          }
        }
      }

      if (stateChanged) {
        await this.prisma.plant.update({
          where: { id: plant.id },
          data: updates,
        });
        updatedCount++;
      }
    }

    this.logger.log(`Auto-progressed ${updatedCount} plants (Hydration cycle)`);
  }

  /**
   * Calculate stage based on accumulated active growth hours
   */
  private calculateStageFromHours(hours: number, plantType: string): string | null {
    const config = PLANT_CONFIGS[plantType] || PLANT_CONFIGS.ALGAE;

    // Reverse check thresholds
    // This requires config to have duration mapping or we infer it.
    // Based on game-config:
    // SPROUT: duration
    // GROWING: duration
    // BLOOM: duration
    // FRUIT: duration

    // Let's create accumulated thresholds from duration
    let total = 0;
    if (hours >= config.stages.FRUIT.duration) return "MATURE";
    if (hours >= config.stages.BLOOM.duration) return "BLOOM";
    if (hours >= config.stages.GROWING.duration) return "GROWING";
    if (hours >= config.stages.SPROUT.duration) return "SPROUT";

    return null;
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
          plantedAt: land.plant.plantedAt,
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
          lt: new Date(now.getTime() - PLANT_CONSTANTS.WILT_HOURS * 60 * 60 * 1000),
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
