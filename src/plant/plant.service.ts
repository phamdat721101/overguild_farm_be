import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient } from "@prisma/client";
import { SeedService } from "../seed/seed.service";

@Injectable()
export class PlantService {
  private readonly logger = new Logger(PlantService.name);

  // Plant type configurations (removed bucketRequired field)
  private readonly PLANT_CONFIGS = {
    ALGAE: {
      name: "Tảo",
      source: "Shop/Starter",
      diggingHours: 1,
      growingHours: 12,
      totalHours: 13,
      baseYield: 3,
    },
    MUSHROOM: {
      name: "Nấm",
      source: "Craft (5 Tảo)",
      diggingHours: 10,
      growingHours: 72,
      totalHours: 82,
      baseYield: 5,
      craftCost: { ALGAE: 5 },
    },
    TREE: {
      name: "Cây",
      source: "NFT Seed",
      diggingHours: 72, // 3 days
      growingHours: 720, // 30 days
      totalHours: 792, // ~33 days
      baseYield: 10,
    },
  };

  constructor(
    private readonly prisma: PrismaClient,
    private readonly seedService: SeedService,
  ) {}

  /**
   * Plant a seed - starts DIGGING phase
   * ✅ Simplified: No bucket required
   */
  async plantSeed(userId: string, landId: string, seedType: string) {
    // Validate plant type
    const config = this.PLANT_CONFIGS[seedType];
    if (!config) {
      throw new BadRequestException(
        `Invalid seed type. Must be one of: ALGAE, MUSHROOM, TREE`,
      );
    }

    // Validate land ownership
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

    // Consume seed from inventory
    await this.seedService.consumeSeed(userId, seedType);

    // Create plant in DIGGING phase
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
      `User ${userId} planted ${seedType} on land ${landId}. Digging for ${config.diggingHours}h.`,
    );

    return {
      plant,
      message: `🌱 Successfully planted ${config.name}! Digging phase: ${config.diggingHours} hours`,
      phase: "DIGGING",
      diggingTime: `${config.diggingHours}h`,
      growingTime: `${config.growingHours}h`,
      totalTime: `${config.totalHours}h`,
      note: "Water the plant during GROWING phase to speed up growth",
    };
  }

  /**
   * Water a plant (only works in GROWING phase)
   */
  async waterPlant(plantId: string, watererId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    // Can only water during GROWING phase
    if (plant.stage !== "GROWING") {
      throw new BadRequestException(
        `Cannot water plant in ${plant.stage} phase. Wait until digging completes.`,
      );
    }

    // Check if already watered by this user today
    if (plant.wateredBy.includes(watererId)) {
      throw new BadRequestException("You already watered this plant today");
    }

    // Update plant
    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        waterCount: { increment: 1 },
        interactions: { increment: 1 },
        lastWateredAt: new Date(),
        wateredBy: { push: watererId },
        lastInteractedAt: new Date(),
      },
    });

    // Check if ready to harvest
    await this.checkGrowthCompletion(updatedPlant);

    this.logger.log(`User ${watererId} watered plant ${plantId}`);

    return {
      plant: updatedPlant,
      message: "💧 Plant watered successfully!",
      waterCount: updatedPlant.waterCount,
    };
  }

  /**
   * Interact with plant (visit/social action)
   * Legacy method for backward compatibility
   */
  async interactPlant(
    plantId: string,
    userId: string,
    action: "visit" | "social",
  ) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant) {
      throw new NotFoundException("Plant not found");
    }

    if (plant.land.userId !== userId) {
      throw new BadRequestException(
        "You can only interact with your own plants",
      );
    }

    if (plant.stage !== "GROWING" && plant.stage !== "MATURE") {
      throw new BadRequestException(
        `Cannot interact with plant in ${plant.stage} stage`,
      );
    }

    const growthBoost = action === "visit" ? 1 : 2;

    const updatedPlant = await this.prisma.plant.update({
      where: { id: plantId },
      data: {
        interactions: { increment: 1 },
        lastInteractedAt: new Date(),
      },
    });

    await this.checkGrowthCompletion(updatedPlant);

    return {
      plant: updatedPlant,
      message:
        action === "visit"
          ? "👀 Visited plant! +1 interaction"
          : "🤝 Social interaction! +2 interactions",
      growthBoost,
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
   * Harvest mature plant
   */
  async harvestPlant(plantId: string, userId: string) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      include: { land: true },
    });

    if (!plant || plant.land.userId !== userId) {
      throw new NotFoundException("Plant not found");
    }

    if (plant.stage !== "MATURE") {
      throw new BadRequestException(
        `Plant is not ready. Current stage: ${plant.stage}`,
      );
    }

    const config = this.PLANT_CONFIGS[plant.type];
    const baseYield = config.baseYield;
    const bonusYield = Math.floor(plant.waterCount * 0.5); // +0.5 per water
    const totalYield = baseYield + bonusYield;

    // Add fruits to inventory
    await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: { userId, itemType: `FRUIT_${plant.type}` },
      },
      create: {
        userId,
        itemType: `FRUIT_${plant.type}`,
        amount: totalYield,
      },
      update: {
        amount: { increment: totalYield },
      },
    });

    // Delete plant
    await this.prisma.plant.delete({
      where: { id: plantId },
    });

    this.logger.log(
      `User ${userId} harvested ${totalYield} ${plant.type} fruits`,
    );

    return {
      success: true,
      harvest: {
        plantType: plant.type,
        fruitYield: totalYield,
        baseYield,
        bonusYield,
        waterCount: plant.waterCount,
      },
      message: `🎉 Harvested ${totalYield} ${config.name} fruits!`,
    };
  }

  /**
   * Get garden with growth progress
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
          plant: null,
          status: "EMPTY",
        };
      }

      const plant = land.plant;

      // Safely get config with fallback
      const config = this.PLANT_CONFIGS[plant.type] || {
        name: plant.type,
        source: "Unknown",
        diggingHours: 1,
        growingHours: 12,
        totalHours: 13,
        baseYield: 3,
      };

      let progress = 0;
      let timeRemaining = "";
      let canWater = false;

      if (plant.stage === "DIGGING" && plant.diggingStartedAt) {
        const endTime = new Date(
          plant.diggingStartedAt.getTime() +
            plant.diggingDuration * 60 * 60 * 1000,
        );
        const elapsed = now.getTime() - plant.diggingStartedAt.getTime();
        const total = plant.diggingDuration * 60 * 60 * 1000;
        progress = Math.min(100, Math.floor((elapsed / total) * 100));

        const remaining = Math.max(0, endTime.getTime() - now.getTime());
        timeRemaining = this.formatTimeRemaining(remaining);
      }

      if (plant.stage === "GROWING" && plant.growingStartedAt) {
        const endTime = new Date(
          plant.growingStartedAt.getTime() +
            plant.growingDuration * 60 * 60 * 1000,
        );
        const elapsed = now.getTime() - plant.growingStartedAt.getTime();
        const total = plant.growingDuration * 60 * 60 * 1000;
        progress = Math.min(100, Math.floor((elapsed / total) * 100));

        const remaining = Math.max(0, endTime.getTime() - now.getTime());
        timeRemaining = this.formatTimeRemaining(remaining);
        canWater = !plant.wateredBy.includes(userId);
      }

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
        },
        progress: {
          percentage: progress,
          timeRemaining,
          stage: plant.stage,
          canWater,
        },
        config: {
          diggingTime: `${config.diggingHours}h`,
          growingTime: `${config.growingHours}h`,
          totalTime: `${config.totalHours}h`,
          baseYield: config.baseYield,
        },
      };
    });
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
}
