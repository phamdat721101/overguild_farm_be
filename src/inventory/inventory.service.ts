import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ItemCategory } from "./dto/query-inventory.dto";
import { AddItemDto, RemoveItemDto, TransferItemDto } from "./dto/add-item.dto";
import { ITEM_METADATA } from "../common/constants/game-config.constant";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Get user's complete inventory with filtering
   * ✅ OPTIMIZED: Category and search filters now efficiently handled at DB level or optimized via constants
   */
  async getInventory(userId: string, category?: ItemCategory, search?: string) {
    let whereClause: any = { userId };

    // Apply category filter
    if (category && category !== ItemCategory.ALL) {
      const itemTypes = this.getItemTypesByCategory(category);

      // ✅ If search exists, filter itemTypes first
      if (search) {
        const searchUpper = search.toUpperCase();
        const filteredTypes = itemTypes.filter((type) =>
          type.includes(searchUpper),
        );
        whereClause.itemType = { in: filteredTypes };
      } else {
        whereClause.itemType = { in: itemTypes };
      }
    } else if (search) {
      // ✅ Only search, no category filter
      whereClause.itemType = {
        contains: search.toUpperCase(),
      };
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: [{ itemType: "asc" }, { createdAt: "desc" }],
    });

    // Group by category
    const grouped = this.groupItemsByCategory(items);

    // Calculate totals
    const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
    const totalTypes = items.length;

    this.logger.log(
      `User ${userId} inventory: ${totalTypes} types, ${totalItems} items (category: ${category || "ALL"
      }, search: "${search || "none"}")`,
    );

    return {
      userId,
      inventory: items.map((item) => this.enrichItemData(item)),
      grouped,
      summary: {
        totalItems,
        totalTypes,
        categories: Object.keys(grouped).length,
      },
    };
  }

  /**
   * Get inventory summary (quick overview)
   */
  async getInventorySummary(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId },
    });

    const summary = {
      seeds: 0,
      fruits: 0,
      fertilizers: 0,
      eventRewards: 0,
      total: 0,
    };

    items.forEach((item) => {
      summary.total += item.amount;

      if (item.itemType.startsWith("SEED_")) {
        summary.seeds += item.amount;
      } else if (
        item.itemType === "FRUIT" ||
        item.itemType.startsWith("FRUIT_")
      ) {
        summary.fruits += item.amount;
      } else if (item.itemType.startsWith("FERTILIZER_")) {
        summary.fertilizers += item.amount;
      } else if (item.itemType.includes("EVENT")) {
        summary.eventRewards += item.amount;
      }
    });

    return summary;
  }

  // Currency items that should NOT be in inventory (use user.balanceGold/Gem instead)
  private readonly BLOCKED_CURRENCY_ITEMS = ["GOLD", "GEM"];

  /**
   * Add item to inventory (admin/system use)
   */
  async addItem(userId: string, dto: AddItemDto) {
    // ❌ Block currency items - these should be on User model
    if (this.BLOCKED_CURRENCY_ITEMS.includes(dto.itemType.toUpperCase())) {
      throw new BadRequestException(
        `${dto.itemType} is a currency and cannot be added to inventory. Use user.balanceGold/balanceGem instead.`
      );
    }

    const item = await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: { userId, itemType: dto.itemType },
      },
      create: {
        userId,
        itemType: dto.itemType,
        amount: dto.amount,
      },
      update: {
        amount: { increment: dto.amount },
      },
    });

    this.logger.log(`Added ${dto.amount}x ${dto.itemType} to user ${userId}`);

    return {
      success: true,
      item: this.enrichItemData(item),
      message: `Added ${dto.amount}x ${dto.itemType} to inventory`,
    };
  }

  /**
   * Remove item from inventory
   */
  async removeItem(userId: string, dto: RemoveItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: { userId, itemType: dto.itemType },
      },
    });

    if (!item || item.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${item?.amount || 0}, need ${dto.amount}`,
      );
    }

    let updatedItem;
    if (item.amount === dto.amount) {
      // Delete if removing all
      await this.prisma.inventoryItem.delete({ where: { id: item.id } });
      updatedItem = null;
    } else {
      // Decrement amount
      updatedItem = await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: { amount: { decrement: dto.amount } },
      });
    }

    this.logger.log(
      `Removed ${dto.amount}x ${dto.itemType} from user ${userId}`,
    );

    return {
      success: true,
      item: updatedItem ? this.enrichItemData(updatedItem) : null,
      message: `Removed ${dto.amount}x ${dto.itemType} from inventory`,
    };
  }

  /**
   * Transfer item to another user
   */
  async transferItem(senderId: string, dto: TransferItemDto) {
    // Find recipient by ID or wallet address
    const recipient = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: dto.recipientId },
          { walletAddress: dto.recipientId.toLowerCase() },
        ],
      },
    });

    if (!recipient) {
      throw new NotFoundException("Recipient user not found");
    }

    if (recipient.id === senderId) {
      throw new BadRequestException("Cannot transfer items to yourself");
    }

    // Check sender has enough items
    const senderItem = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: { userId: senderId, itemType: dto.itemType },
      },
    });

    if (!senderItem || senderItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${senderItem?.amount || 0}, need ${dto.amount}`,
      );
    }

    // Execute transfer in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Remove from sender
      if (senderItem.amount === dto.amount) {
        await tx.inventoryItem.delete({ where: { id: senderItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: senderItem.id },
          data: { amount: { decrement: dto.amount } },
        });
      }

      // Add to recipient
      const recipientItem = await tx.inventoryItem.upsert({
        where: {
          userId_itemType: { userId: recipient.id, itemType: dto.itemType },
        },
        create: {
          userId: recipient.id,
          itemType: dto.itemType,
          amount: dto.amount,
        },
        update: {
          amount: { increment: dto.amount },
        },
      });

      return { recipientItem };
    });

    this.logger.log(
      `User ${senderId} transferred ${dto.amount}x ${dto.itemType} to ${recipient.id} (${recipient.walletAddress})`,
    );

    return {
      success: true,
      transfer: {
        from: senderId,
        to: recipient.id,
        toWallet: recipient.walletAddress,
        itemType: dto.itemType,
        amount: dto.amount,
        message: dto.message,
      },
      message: `Successfully transferred ${dto.amount}x ${dto.itemType} to ${recipient.username || recipient.walletAddress}`,
    };
  }

  /**
   * Check if user has enough of an item
   */
  async hasItem(
    userId: string,
    itemType: string,
    amount: number = 1,
  ): Promise<boolean> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: { userId, itemType },
      },
    });

    return item ? item.amount >= amount : false;
  }

  /**
   * Backwards-compatible alias for hasItem (for other modules)
   */
  async hasItemAmount(
    userId: string,
    itemType: string,
    amount: number = 1,
  ): Promise<boolean> {
    return this.hasItem(userId, itemType, amount);
  }

  /**
   * Get item types by category
   * ✅ ENHANCED: Now uses ITEM_METADATA for consistency
   */
  private getItemTypesByCategory(category: ItemCategory): string[] {
    // Map old category names to new ones
    const categoryMap: Record<string, string[]> = {
      [ItemCategory.SEEDS]: Object.keys(ITEM_METADATA).filter((k) =>
        k.startsWith("SEED_"),
      ),
      [ItemCategory.FRUITS]: [
        "FRUIT",
        "FRUIT_ALGAE",
        "FRUIT_MUSHROOM",
        "FRUIT_TREE",
      ],
      [ItemCategory.FERTILIZERS]: Object.keys(ITEM_METADATA).filter((k) =>
        k.startsWith("FERTILIZER_"),
      ),
      [ItemCategory.EVENT_REWARDS]: Object.keys(ITEM_METADATA).filter(
        (k) => k.includes("EVENT") || k.includes("CHECKIN"),
      ),
      [ItemCategory.CONSUMABLES]: [
        "WATER",
        ...Object.keys(ITEM_METADATA).filter((k) =>
          k.startsWith("FERTILIZER_"),
        ),
      ],
    };

    return categoryMap[category] || [];
  }

  /**
   * Group items by category
   */
  private groupItemsByCategory(items: any[]) {
    const grouped: Record<string, any[]> = {};

    items.forEach((item) => {
      const metadata = ITEM_METADATA[item.itemType] || {
        category: "OTHER",
      };
      const category = metadata.category;

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(this.enrichItemData(item));
    });

    return grouped;
  }

  /**
   * Enrich item data with metadata
   */
  private enrichItemData(item: any) {
    const metadata = ITEM_METADATA[item.itemType] || {
      name: item.itemType,
      rarity: "COMMON",
      category: "OTHER",
      icon: "📦",
    };

    return {
      id: item.id,
      itemType: item.itemType,
      amount: item.amount,
      ...metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
