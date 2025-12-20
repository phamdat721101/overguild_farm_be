import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Get user seeds from inventory_items
   * Filters for SEED_* item types
   */
  async getUserSeeds(userId: string) {
    const seedItems = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        itemType: {
          startsWith: "SEED_",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match old format for backward compatibility
    return seedItems.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.itemType.replace("SEED_", ""), // SEED_COMMON -> COMMON
      rarity: this.getRarityFromType(item.itemType),
      quantity: item.amount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  /**
   * Add seed to inventory_items
   * @param type - Seed type (e.g., 'COMMON', 'RARE') - will be stored as 'SEED_COMMON'
   */
  async addSeed(userId: string, type: string, rarity: string = "COMMON") {
    const itemType = `SEED_${type.toUpperCase()}`;

    return this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType_location: { userId, itemType, location: "STORAGE" },
      },
      create: {
        userId,
        itemType,
        amount: 1,
      },
      update: {
        amount: { increment: 1 },
      },
    });
  }

  /**
   * Consume seed from inventory_items
   * @param type - Seed type (e.g., 'COMMON', 'RARE') - will look for 'SEED_COMMON'
   */
  async consumeSeed(userId: string, type: string) {
    const itemType = `SEED_${type.toUpperCase()}`;

    const seedItem = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType_location: { userId, itemType, location: "STORAGE" },
      },
    });

    if (!seedItem || seedItem.amount < 1) {
      throw new NotFoundException(`No ${type} seed available`);
    }

    if (seedItem.amount === 1) {
      await this.prisma.inventoryItem.delete({ where: { id: seedItem.id } });
      return null;
    }

    return this.prisma.inventoryItem.update({
      where: { id: seedItem.id },
      data: { amount: { decrement: 1 } },
    });
  }

  /**
   * Craft MUSHROOM seed from 5 ALGAE fruits
   */
  async craftMushroom(userId: string) {
    // Check if user has 5 ALGAE fruits
    const algaeFruit = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType_location: { userId, itemType: "FRUIT_ALGAE", location: "STORAGE" },
      },
    });

    if (!algaeFruit || algaeFruit.amount < 5) {
      throw new BadRequestException(
        "You need 5 ALGAE fruits to craft MUSHROOM seed",
      );
    }

    // Consume 5 ALGAE fruits
    await this.prisma.inventoryItem.update({
      where: { id: algaeFruit.id },
      data: { amount: { decrement: 5 } },
    });

    // Add MUSHROOM seed
    const seed = await this.addSeed(userId, "MUSHROOM", "COMMON");

    return {
      success: true,
      seed,
      message: "🍄 Crafted 1 MUSHROOM seed from 5 ALGAE fruits!",
    };
  }

  /**
   * Get rarity from seed item type
   */
  private getRarityFromType(itemType: string): string {
    if (itemType.includes("LEGENDARY")) return "LEGENDARY";
    if (itemType.includes("EPIC")) return "EPIC";
    if (itemType.includes("RARE")) return "RARE";
    return "COMMON";
  }
}
