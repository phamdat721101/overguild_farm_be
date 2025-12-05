import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class FertilizerService {
  private readonly logger = new Logger(FertilizerService.name);

  // Fertilizer effects based on rarity
  private readonly FERTILIZER_EFFECTS = {
    FERTILIZER_COMMON: {
      growthBoost: 1, // +1 interaction equivalent
      soilFertility: 5, // +5 fertility
      duration: 24, // 24 hours
    },
    FERTILIZER_RARE: {
      growthBoost: 2,
      soilFertility: 10,
      duration: 48,
    },
    FERTILIZER_EPIC: {
      growthBoost: 3,
      soilFertility: 15,
      duration: 72,
    },
    FERTILIZER_LEGENDARY: {
      growthBoost: 5,
      soilFertility: 25,
      duration: 168, // 7 days
    },
  };

  // Composting rates: fruits → fertilizer
  private readonly COMPOST_RATES = {
    FERTILIZER_COMMON: 3, // 3 fruits = 1 common fertilizer
    FERTILIZER_RARE: 10, // 10 fruits = 1 rare fertilizer
    FERTILIZER_EPIC: 30, // 30 fruits = 1 epic fertilizer
    FERTILIZER_LEGENDARY: 100, // 100 fruits = 1 legendary fertilizer
  };

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get user's fertilizer inventory
   */
  async getFertilizerInventory(userId: string) {
    const fertilizers = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        itemType: {
          in: [
            "FERTILIZER_COMMON",
            "FERTILIZER_RARE",
            "FERTILIZER_EPIC",
            "FERTILIZER_LEGENDARY",
          ],
        },
      },
      orderBy: {
        itemType: "asc",
      },
    });

    return {
      fertilizers: fertilizers.map((f) => ({
        type: f.itemType,
        amount: f.amount,
        rarity: this.getRarityFromType(f.itemType),
      })),
      total: fertilizers.reduce((sum, f) => sum + f.amount, 0),
    };
  }

  /**
   * Apply fertilizer to a plant
   * - Consumes fertilizer from inventory
   * - Boosts plant growth (adds interactions)
   * - Improves soil quality
   */
  async applyFertilizer(
    userId: string,
    landId: string,
    fertilizerType: string,
  ) {
    // Validate land ownership
    const land = await this.prisma.land.findFirst({
      where: { id: landId, userId },
      include: { plant: true },
    });

    if (!land) {
      throw new NotFoundException("Land not found or does not belong to you");
    }

    if (!land.plant) {
      throw new BadRequestException(
        "No plant on this land. Plant a seed first!",
      );
    }

    if (land.plant.stage === "DEAD") {
      throw new BadRequestException("Cannot apply fertilizer to a dead plant");
    }

    if (land.plant.stage === "FRUIT") {
      throw new BadRequestException(
        "Plant is ready to harvest! Apply fertilizer after harvesting.",
      );
    }

    // Check fertilizer inventory
    const fertilizer = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: { userId, itemType: fertilizerType },
      },
    });

    if (!fertilizer || fertilizer.amount < 1) {
      throw new BadRequestException(`You don't have enough ${fertilizerType}`);
    }

    // Get fertilizer effect
    const effect = this.FERTILIZER_EFFECTS[fertilizerType];
    if (!effect) {
      throw new BadRequestException("Invalid fertilizer type");
    }

    // Consume fertilizer
    await this.prisma.inventoryItem.update({
      where: { id: fertilizer.id },
      data: { amount: { decrement: 1 } },
    });

    // Apply growth boost (add interactions)
    const newInteractions = land.plant.interactions + effect.growthBoost;

    // Calculate new stage based on interactions
    const newStage = this.calculateStage(newInteractions);

    // Update soil quality
    const currentSoil = (land.soilQuality as any) || {
      fertility: 50,
      hydration: 50,
    };
    const newSoilQuality = {
      fertility: Math.min(100, currentSoil.fertility + effect.soilFertility),
      hydration: currentSoil.hydration,
    };

    // Update plant and land
    const updatedPlant = await this.prisma.plant.update({
      where: { id: land.plant.id },
      data: {
        interactions: newInteractions,
        stage: newStage,
        lastInteractedAt: new Date(),
      },
      include: { land: true },
    });

    await this.prisma.land.update({
      where: { id: landId },
      data: { soilQuality: newSoilQuality },
    });

    const stageChanged = land.plant.stage !== newStage;

    this.logger.log(
      `User ${userId} applied ${fertilizerType} to plant ${land.plant.id}. ` +
        `Stage: ${land.plant.stage} → ${newStage}, Interactions: ${land.plant.interactions} → ${newInteractions}`,
    );

    return {
      success: true,
      plant: updatedPlant,
      stageChanged,
      oldStage: land.plant.stage,
      newStage,
      interactions: newInteractions,
      soilQuality: newSoilQuality,
      fertilizerUsed: fertilizerType,
      effect: {
        growthBoost: effect.growthBoost,
        soilFertilityBoost: effect.soilFertility,
        duration: effect.duration,
      },
      message: stageChanged
        ? `🎉 Fertilizer applied! Plant grew to ${newStage} stage!`
        : `✅ Fertilizer applied! Plant received ${effect.growthBoost} growth boost.`,
    };
  }

  /**
   * Compost fruits to create fertilizer
   * Burns fruits and converts them to fertilizer based on rates
   */
  async compostFruits(userId: string, fruitAmount: number) {
    // Check fruit inventory
    const fruits = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: { userId, itemType: "FRUIT" },
      },
    });

    if (!fruits || fruits.amount < fruitAmount) {
      throw new BadRequestException(
        `You don't have enough fruits. You have ${fruits?.amount || 0}, need ${fruitAmount}`,
      );
    }

    // Calculate fertilizer rewards based on composting rates
    let remainingFruits = fruitAmount;
    const rewards: { type: string; amount: number }[] = [];

    // Try to create highest rarity first
    const sortedRates = Object.entries(this.COMPOST_RATES).sort(
      (a, b) => b[1] - a[1],
    ); // Sort descending by fruit cost

    for (const [fertilizerType, fruitCost] of sortedRates) {
      if (remainingFruits >= fruitCost) {
        const amount = Math.floor(remainingFruits / fruitCost);
        rewards.push({ type: fertilizerType, amount });
        remainingFruits = remainingFruits % fruitCost;
      }
    }

    if (rewards.length === 0) {
      throw new BadRequestException(
        `Not enough fruits to create fertilizer. Minimum: ${Math.min(...Object.values(this.COMPOST_RATES))} fruits`,
      );
    }

    // Consume fruits
    await this.prisma.inventoryItem.update({
      where: { id: fruits.id },
      data: { amount: { decrement: fruitAmount } },
    });

    // Add fertilizer rewards
    for (const reward of rewards) {
      await this.prisma.inventoryItem.upsert({
        where: {
          userId_itemType: { userId, itemType: reward.type },
        },
        create: {
          userId,
          itemType: reward.type,
          amount: reward.amount,
        },
        update: {
          amount: { increment: reward.amount },
        },
      });
    }

    this.logger.log(
      `User ${userId} composted ${fruitAmount} fruits, received: ${rewards.map((r) => `${r.amount}x ${r.type}`).join(", ")}`,
    );

    return {
      success: true,
      fruitsConsumed: fruitAmount,
      fertilizersCreated: rewards,
      message: `🔥 Composted ${fruitAmount} fruits! Created: ${rewards.map((r) => `${r.amount}x ${r.type}`).join(", ")}`,
    };
  }

  /**
   * Calculate plant stage based on interactions
   */
  private calculateStage(interactions: number): string {
    if (interactions >= 15) return "FRUIT";
    if (interactions >= 8) return "BLOOM";
    if (interactions >= 3) return "SPROUT";
    return "SEED";
  }

  /**
   * Get rarity from fertilizer type
   */
  private getRarityFromType(type: string): string {
    if (type.includes("LEGENDARY")) return "LEGENDARY";
    if (type.includes("EPIC")) return "EPIC";
    if (type.includes("RARE")) return "RARE";
    return "COMMON";
  }
}
