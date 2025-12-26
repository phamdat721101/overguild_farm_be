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
import {
  InventoryLocation,
  BACKPACK_CAPACITY,
} from "./constants/inventory-locations";
import { MoveToBackpackDto } from "./dto/move-to-backpack.dto";
import { MoveToStorageDto } from "./dto/move-to-storage.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventEmitter: EventEmitter2
  ) { }

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
          type.includes(searchUpper)
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
      }, search: "${search || "none"}")`
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

    // Check if item exists in storage or specified location
    const targetLocation = dto.location || InventoryLocation.STORAGE;

    const existingItem = await this.prisma.inventoryItem.findFirst({
      where: {
        userId,
        itemType: dto.itemType,
        location: targetLocation,
      },
    });

    const item = existingItem
      ? await this.prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: { amount: { increment: dto.amount } },
      })
      : await this.prisma.inventoryItem.create({
        data: {
          userId,
          itemType: dto.itemType,
          amount: dto.amount,
          location: targetLocation,
        },
      });

    this.logger.log(`Added ${dto.amount}x ${dto.itemType} to user ${userId} at ${targetLocation}`);

    const enrichedItem = this.enrichItemData(item);
    this.eventEmitter.emit("inventory.updated", {
      userId,
      items: [enrichedItem],
    });

    return {
      success: true,
      item: enrichedItem,
      message: `Added ${dto.amount}x ${dto.itemType} to ${targetLocation.toLowerCase()}`,
    };
  }

  /**
   * Remove item from inventory
   */
  async removeItem(userId: string, dto: RemoveItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType_location: { userId, itemType: dto.itemType, location: InventoryLocation.STORAGE },
      },
    });

    if (!item || item.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${item?.amount || 0}, need ${dto.amount}`
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
      `Removed ${dto.amount}x ${dto.itemType} from user ${userId}`
    );

    if (updatedItem) {
      this.eventEmitter.emit("inventory.updated", {
        userId,
        items: [this.enrichItemData(updatedItem)],
      });
    } else {
      // Item removed completely, sending update with 0 amount or handling deletion on FE
      // For now, let's just trigger update.
      // Ideally we might want to send the deleted ID or state.
      // But re-fetching might be safer if we don't send simplified events.
      // Let's send a specific event or just the item with 0 amount if needed,
      // but here we don't have the object anymore if deleted.
      // We can send the previous item ID with 0 amount to signal deletion if we want.
      this.eventEmitter.emit("inventory.updated", {
        userId,
        items: [{ ...this.enrichItemData(item), amount: 0 }],
      });
    }

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
        userId_itemType_location: { userId: senderId, itemType: dto.itemType, location: InventoryLocation.STORAGE },
      },
    });

    if (!senderItem || senderItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${senderItem?.amount || 0}, need ${dto.amount}`
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
      const existingRecipientItem = await tx.inventoryItem.findUnique({
        where: {
          userId_itemType_location: { userId: recipient.id, itemType: dto.itemType, location: InventoryLocation.STORAGE },
        },
      });

      const recipientItem = existingRecipientItem
        ? await tx.inventoryItem.update({
          where: { id: existingRecipientItem.id },
          data: { amount: { increment: dto.amount } },
        })
        : await tx.inventoryItem.create({
          data: {
            userId: recipient.id,
            itemType: dto.itemType,
            amount: dto.amount,
            location: InventoryLocation.STORAGE,
          },
        });

      return { recipientItem };
    });

    this.logger.log(
      `User ${senderId} transferred ${dto.amount}x ${dto.itemType} to ${recipient.id} (${recipient.walletAddress})`
    );

    this.eventEmitter.emit("inventory.updated", {
      userId: senderId,
      items: [
        senderItem.amount === dto.amount
          ? { ...this.enrichItemData(senderItem), amount: 0 }
          : { ...this.enrichItemData(senderItem), amount: senderItem.amount - dto.amount }
      ],
    });

    this.eventEmitter.emit("inventory.updated", {
      userId: recipient.id,
      items: [this.enrichItemData(result.recipientItem)],
    });

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
    amount: number = 1
  ): Promise<boolean> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType_location: { userId, itemType, location: InventoryLocation.STORAGE },
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
    amount: number = 1
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
        k.startsWith("SEED_")
      ),
      [ItemCategory.FRUITS]: [
        "FRUIT",
        "FRUIT_ALGAE",
        "FRUIT_MUSHROOM",
        "FRUIT_TREE",
      ],
      [ItemCategory.FERTILIZERS]: Object.keys(ITEM_METADATA).filter((k) =>
        k.startsWith("FERTILIZER_")
      ),
      [ItemCategory.EVENT_REWARDS]: Object.keys(ITEM_METADATA).filter(
        (k) => k.includes("EVENT") || k.includes("CHECKIN")
      ),
      [ItemCategory.CONSUMABLES]: [
        "WATER",
        ...Object.keys(ITEM_METADATA).filter((k) =>
          k.startsWith("FERTILIZER_")
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
      location: item.location || "STORAGE",
      ...metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Get backpack items (items user is carrying)
   */
  async getBackpack(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        location: InventoryLocation.BACKPACK,
      },
      orderBy: { itemType: "asc" },
    });

    const totalSlots = items.reduce((sum, item) => sum + 1, 0); // Each item type = 1 slot
    const usedSlots = items.length;
    const availableSlots = BACKPACK_CAPACITY - usedSlots;

    return {
      userId,
      backpack: items.map((item) => this.enrichItemData(item)),
      capacity: {
        total: BACKPACK_CAPACITY,
        used: usedSlots,
        available: availableSlots,
      },
    };
  }

  /**
   * Get storage items (main storage)
   */
  async getStorage(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        location: InventoryLocation.STORAGE,
      },
      orderBy: { itemType: "asc" },
    });

    return {
      userId,
      storage: items.map((item) => this.enrichItemData(item)),
      summary: {
        totalTypes: items.length,
        totalItems: items.reduce((sum, item) => sum + item.amount, 0),
      },
    };
  }

  /**
   * Move item from storage to backpack
   */
  async moveToBackpack(userId: string, dto: MoveToBackpackDto) {
    // Check backpack capacity
    const backpackItems = await this.prisma.inventoryItem.findMany({
      where: {
        userId,
        location: InventoryLocation.BACKPACK,
      },
    });

    const existingBackpackItem = backpackItems.find(
      (item) => item.itemType === dto.itemType
    );

    if (!existingBackpackItem && backpackItems.length >= BACKPACK_CAPACITY) {
      throw new BadRequestException(
        `Backpack is full (${BACKPACK_CAPACITY}/${BACKPACK_CAPACITY} slots)`
      );
    }

    // Check storage has enough items
    const storageItem = await this.prisma.inventoryItem.findFirst({
      where: {
        userId,
        itemType: dto.itemType,
        location: InventoryLocation.STORAGE,
      },
    });

    if (!storageItem || storageItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType} in storage. You have ${storageItem?.amount || 0}, need ${dto.amount}`
      );
    }

    // Move items in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Remove from storage
      if (storageItem.amount === dto.amount) {
        await tx.inventoryItem.delete({ where: { id: storageItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: storageItem.id },
          data: { amount: { decrement: dto.amount } },
        });
      }

      // Add to backpack
      const existingBackpack = await tx.inventoryItem.findFirst({
        where: {
          userId,
          itemType: dto.itemType,
          location: InventoryLocation.BACKPACK,
        },
      });

      const backpackItem = existingBackpack
        ? await tx.inventoryItem.update({
          where: { id: existingBackpack.id },
          data: { amount: { increment: dto.amount } },
        })
        : await tx.inventoryItem.create({
          data: {
            userId,
            itemType: dto.itemType,
            amount: dto.amount,
            location: InventoryLocation.BACKPACK,
          },
        });

      return { backpackItem };
    });

    this.logger.log(
      `User ${userId} moved ${dto.amount}x ${dto.itemType} from storage to backpack`
    );

    const enrichedBackpackItem = this.enrichItemData(result.backpackItem);
    this.eventEmitter.emit("inventory.updated", {
      userId,
      items: [enrichedBackpackItem],
    });

    return {
      success: true,
      item: enrichedBackpackItem,
      message: `Moved ${dto.amount}x ${dto.itemType} to backpack`,
    };
  }

  /**
   * Move item from backpack to storage
   */
  async moveToStorage(userId: string, dto: MoveToStorageDto) {
    // Check backpack has enough items
    const backpackItem = await this.prisma.inventoryItem.findFirst({
      where: {
        userId,
        itemType: dto.itemType,
        location: InventoryLocation.BACKPACK,
      },
    });

    if (!backpackItem || backpackItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType} in backpack. You have ${backpackItem?.amount || 0}, need ${dto.amount}`
      );
    }

    // Move items in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Remove from backpack
      if (backpackItem.amount === dto.amount) {
        await tx.inventoryItem.delete({ where: { id: backpackItem.id } });
      } else {
        await tx.inventoryItem.update({
          where: { id: backpackItem.id },
          data: { amount: { decrement: dto.amount } },
        });
      }

      // Add to storage
      const existingStorage = await tx.inventoryItem.findFirst({
        where: {
          userId,
          itemType: dto.itemType,
          location: InventoryLocation.STORAGE,
        },
      });

      const storageItem = existingStorage
        ? await tx.inventoryItem.update({
          where: { id: existingStorage.id },
          data: { amount: { increment: dto.amount } },
        })
        : await tx.inventoryItem.create({
          data: {
            userId,
            itemType: dto.itemType,
            amount: dto.amount,
            location: InventoryLocation.STORAGE,
          },
        });

      return { storageItem };
    });

    this.logger.log(
      `User ${userId} moved ${dto.amount}x ${dto.itemType} from backpack to storage`
    );

    const enrichedStorageItem = this.enrichItemData(result.storageItem);
    this.eventEmitter.emit("inventory.updated", {
      userId,
      items: [enrichedStorageItem],
    });

    return {
      success: true,
      item: enrichedStorageItem,
      message: `Moved ${dto.amount}x ${dto.itemType} to storage`,
    };
  }
}
