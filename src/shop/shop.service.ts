import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryService } from "../inventory/inventory.service";
import { ITEM_TYPES } from "../inventory/constants/item-types";
import { ProgressionService } from "../progression/progression.service";
import {
  GOLD_SHOP_ITEMS,
  GEM_SHOP_ITEMS,
  CASH_SHOP_ITEMS,
  GoldShopItemKey,
  GemShopItemKey,
  CashShopItemKey,
} from "./shop.constants";
import { GoldShopPurchaseDto } from "./dto/gold-shop-purchase.dto";
import { GemShopPurchaseDto } from "./dto/gem-shop-purchase.dto";
import { CashShopPurchaseDto } from "./dto/cash-shop-purchase.dto";

import { EventEmitter2 } from "@nestjs/event-emitter";
// ... imports

@Injectable()
export class ShopService {
  private readonly goldItems = GOLD_SHOP_ITEMS;
  private readonly gemItems = GEM_SHOP_ITEMS;
  private readonly cashItems = CASH_SHOP_ITEMS;
  private readonly WATER_COOLDOWN_HOURS = 12;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventoryService: InventoryService,
    private readonly progressionService: ProgressionService,
    private readonly eventEmitter: EventEmitter2
  ) { }

  /**
   * Claim free water (The Well) - 12h cooldown
   */
  async claimFreeWater(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const now = new Date();
    // Check cooldown
    if (user.lastFreeWaterAt) {
      const nextClaimTime = new Date(
        user.lastFreeWaterAt.getTime() +
        this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      if (now < nextClaimTime) {
        throw new BadRequestException(
          `The Well is dry. Come back at ${nextClaimTime.toISOString()}`
        );
      }
    }

    // Give Water
    await this.inventoryService.addItem(userId, {
      itemType: ITEM_TYPES.WATER,
      amount: 1,
    });

    // Update User
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastFreeWaterAt: now },
    });

    return {
      success: true,
      message: "💧 Collected 1 Water Drop from The Well! (+3h Growth Time)",
      item: ITEM_TYPES.WATER,
      amount: 1,
      nextClaimAt: new Date(
        now.getTime() + this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  async getFreeWaterStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastFreeWaterAt: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const now = new Date();
    let nextClaimTime = now;
    let isReady = true;

    if (user.lastFreeWaterAt) {
      nextClaimTime = new Date(
        user.lastFreeWaterAt.getTime() +
        this.WATER_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      if (now < nextClaimTime) {
        isReady = false;
      } else {
        // If ready, next claim is effectively now (or immediately available)
        nextClaimTime = now;
      }
    }

    return {
      isReady,
      nextClaimAt: isReady ? now.toISOString() : nextClaimTime.toISOString(),
      lastClaimedAt: user.lastFreeWaterAt
        ? user.lastFreeWaterAt.toISOString()
        : null,
    };
  }

  async getGoldShop(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balanceGold: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const limits = await this.getUserLimits(userId);

    const catalog = this.goldItems.map((item) => {
      const key = item.key;

      const limitInfo = limits[key as GoldShopItemKey] || {
        purchased: 0,
        remaining: item.limitPerPeriod ?? null,
      };

      let finalPrice = item.priceGold;

      // Dynamic Pricing for Wishing Well Water
      if (key === GoldShopItemKey.GROWTH_WATER) {
        // Count = purchased
        // 0 -> 50
        // 1 -> 100
        // 2 -> 200
        const count = limitInfo.purchased;
        if (count === 0) finalPrice = 50;
        else if (count === 1) finalPrice = 100;
        else if (count >= 2) finalPrice = 200;
        // Note: item.priceGold in config is base (50), we override display here
      }

      const affordable = user.balanceGold >= finalPrice;

      return {
        ...item,
        priceGold: finalPrice, // Override price
        affordable,
        limit: item.limitPerPeriod ?? null,
        purchased: limitInfo.purchased,
        remaining: limitInfo.remaining,
      };
    });

    return {
      user: {
        id: user.id,
        balanceGold: user.balanceGold,
      },
      items: catalog,
    };
  }

  async purchaseGoldShopItem(userId: string, dto: GoldShopPurchaseDto) {
    const config = this.goldItems.find((i) => i.key === dto.itemKey);
    if (!config) {
      throw new NotFoundException("Shop item not found");
    }

    const now = new Date();

    const purchase = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balanceGold: true, xp: true, balanceGem: true }, // Added balanceGem for event
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Enforce per-period limits
      if (config.period && config.limitPerPeriod) {
        const from = this.getPeriodStart(now, config.period);
        const count = await tx.shopPurchase.count({
          where: {
            userId,
            shopType: "GOLD",
            itemKey: config.key,
            createdAt: { gte: from },
          },
        });

        if (count >= config.limitPerPeriod) {
          throw new BadRequestException(
            `Purchase limit reached for ${config.name} (${config.limitPerPeriod} per ${config.period.toLowerCase()})`
          );
        }
      }

      // Dynamic Pricing for Wishing Well Water
      let finalPrice = config.priceGold;
      if (config.key === GoldShopItemKey.GROWTH_WATER) {
        // Requirement: Level 5+
        const levelConfig = this.progressionService.getCurrentLevelFromXp(
          user.xp
        );
        if (levelConfig.level < 5) {
          throw new BadRequestException("Wishing Well requires Level 5+");
        }

        const from = this.getPeriodStart(now, "DAY"); // Always DAY for water
        const count = await tx.shopPurchase.count({
          where: {
            userId,
            shopType: "GOLD",
            itemKey: config.key,
            createdAt: { gte: from },
          },
        });

        if (count === 0) finalPrice = 50;
        else if (count === 1) finalPrice = 100;
        else if (count === 2) finalPrice = 200;
        else finalPrice = 20000; // Should be blocked by limit, but safe fallback
      }

      // Check gold balance
      if (user.balanceGold < finalPrice) {
        throw new BadRequestException(
          `Not enough gold. Required ${finalPrice}, you have ${user.balanceGold}`
        );
      }

      // Add item to inventory if reward is defined (use tx for transaction consistency)
      if (config.reward?.itemType && config.reward?.amount) {
        const existingItem = await tx.inventoryItem.findUnique({
          where: {
            userId_itemType_location: { userId, itemType: config.reward.itemType, location: "STORAGE" },
          },
        });

        if (existingItem) {
          await tx.inventoryItem.update({
            where: { id: existingItem.id },
            data: { amount: { increment: config.reward.amount } },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              userId,
              itemType: config.reward.itemType,
              amount: config.reward.amount,
            },
          });
        }
      }

      // Handle special exchange item
      if (config.key === GoldShopItemKey.EXCHANGE_SPORE_MUSHROOM) {
        // Require 5 FRUIT_ALGAE -> give 1 FRUIT_MUSHROOM
        const hasSpores = await this.inventoryService.hasItemAmount(
          userId,
          ITEM_TYPES.FRUIT_ALGAE,
          5
        );
        if (!hasSpores) {
          throw new BadRequestException(
            "Not enough Algae Spores (FRUIT_ALGAE). You need at least 5 to exchange."
          );
        }

        await this.inventoryService.removeItem(userId, {
          itemType: ITEM_TYPES.FRUIT_ALGAE,
          amount: 5,
        });

        await this.inventoryService.addItem(userId, {
          itemType: ITEM_TYPES.FRUIT_MUSHROOM,
          amount: 1,
        });
      }

      // Deduct gold
      await tx.user.update({
        where: { id: userId },
        data: { balanceGold: { decrement: finalPrice } },
      });

      // Record purchase
      const record = await tx.shopPurchase.create({
        data: {
          userId,
          shopType: "GOLD",
          itemKey: config.key,
          quantity: 1,
        },
      });

      return {
        record,
        newBalanceGold: user.balanceGold - finalPrice,
        userGemBalance: user.balanceGem,
        finalPrice,
        rewardItem: config.reward ? { itemType: config.reward.itemType, amount: config.reward.amount } : null
      };
    });

    // Emit events after transaction
    this.eventEmitter.emit("currency.updated", {
      userId,
      gold: purchase.newBalanceGold,
      gem: purchase.userGemBalance, // Need to return this from tx or fetch it
    });

    if (purchase.rewardItem) {
      this.eventEmitter.emit("inventory.updated", {
        userId,
        item: purchase.rewardItem
      });
    }

    return {
      success: true,
      message: `Purchased ${config.name} successfully`,
      item: { ...config, priceGold: purchase.finalPrice },
      balanceGold: purchase.newBalanceGold,
      purchase: purchase.record,
    };
  }

  private async getUserLimits(userId: string) {
    const now = new Date();
    const result: Record<
      GoldShopItemKey,
      { purchased: number; remaining: number | null }
    > = {} as any;

    for (const item of this.goldItems) {
      if (!item.period || !item.limitPerPeriod) {
        result[item.key] = { purchased: 0, remaining: null };
        continue;
      }

      const from = this.getPeriodStart(now, item.period);
      const count = await this.prisma.shopPurchase.count({
        where: {
          userId,
          shopType: "GOLD",
          itemKey: item.key,
          createdAt: { gte: from },
        },
      });

      result[item.key] = {
        purchased: count,
        remaining: Math.max(item.limitPerPeriod - count, 0),
      };
    }

    return result;
  }

  private getPeriodStart(now: Date, period: "DAY" | "WEEK"): Date {
    const d = new Date(now);
    if (period === "DAY") {
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // WEEK: start from Monday
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (day + 6) % 7; // 0 for Monday, 6 for Sunday
    d.setDate(d.getDate() - diffToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ===== GEM SHOP =====

  async getGemShop(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balanceGem: true,
        lands: {
          select: { plotIndex: true },
          orderBy: { plotIndex: "asc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const currentLandSlots = user.lands.length;
    const maxLandSlot = Math.max(...user.lands.map((l) => l.plotIndex), 0) + 1;

    const catalog = this.gemItems.map((item) => {
      let affordable = user.balanceGem >= item.priceGem;
      let available = true;

      // Check if land slot is already owned
      if (item.reward?.landSlot) {
        available = item.reward.landSlot > maxLandSlot;
        // Also check if they have the previous slot (optional requirement, but good for progression)
        // For now, simple check: can only buy the next immediate slot
        // actually, let's just check if they ALREADY have it.
        // If they have slot 3, they shouldn't be able to buy slot 2 or 3 again.
        // If they have slot 2, they can buy slot 3.
        // If they have slot 2, they cannot buy slot 4 yet? Usually games enforce order.
        // Let's enforce order: available if item.reward.landSlot === maxLandSlot + 1
        // Wait, maxLandSlot is based on plotIndex.
        // Plot indices are 0-based.
        // Initial user has plot 0. maxLandSlot = 1 (count). Next index is 1 (2nd slot).
        // item.reward.landSlot is 2 (2nd slot).
        // So if user has 1 slot (index 0), maxLandSlot (count) is 1. Next is 2.
        // Available if item.reward.landSlot === currentLandSlots + 1?
        // Let's stick to simple "not owned" check for now, or the strict sequential check.
        // Strict sequential:
        available = item.reward.landSlot === (currentLandSlots + 1);
      }

      return {
        ...item,
        affordable,
        available,
      };
    });

    return {
      user: {
        id: user.id,
        balanceGem: user.balanceGem,
        currentLandSlots,
        maxLandSlot,
      },
      items: catalog,
    };
  }

  async purchaseGemShopItem(userId: string, dto: GemShopPurchaseDto) {
    const config = this.gemItems.find((i) => i.key === dto.itemKey);
    if (!config) {
      throw new NotFoundException("Gem shop item not found");
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      let createdLand: any = null;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balanceGem: true, balanceGold: true },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Check gem balance
      if (user.balanceGem < config.priceGem) {
        throw new BadRequestException(
          `Not enough gems. Required ${config.priceGem}, you have ${user.balanceGem}`
        );
      }

      // Deduct gems
      await tx.user.update({
        where: { id: userId },
        data: { balanceGem: { decrement: config.priceGem } },
      });

      // Give rewards
      if (config.reward) {
        if (config.reward.itemType && config.reward.amount) {
          await this.inventoryService.addItem(userId, {
            itemType: config.reward.itemType,
            amount: config.reward.amount,
          });
        }

        if (config.reward.gold) {
          await tx.user.update({
            where: { id: userId },
            data: { balanceGold: { increment: config.reward.gold } },
          });
        }

        if (config.reward.landSlot) {
          // Use plotIndex from FE if provided (rarely used for fixed slots), 
          // otherwise calculate from landSlot
          // Formula: landSlot 2 -> plotIndex 1
          const newPlotIndex = config.reward.landSlot - 1;

          // Validate plotIndex is not negative
          if (newPlotIndex < 0) {
            throw new BadRequestException("Invalid plot index");
          }

          // Check if plot already exists
          const existingPlot = await tx.land.findFirst({
            where: {
              userId,
              plotIndex: newPlotIndex,
            },
          });

          if (existingPlot) {
            throw new BadRequestException(
              `Land plot ${newPlotIndex} already owned`
            );
          }

          // Verify sequential purchase (optional but recommended)
          // Ensure user has the previous plot (newPlotIndex - 1)
          if (newPlotIndex > 0) {
            const prevPlot = await tx.land.findFirst({
              where: { userId, plotIndex: newPlotIndex - 1 }
            });
            if (!prevPlot) {
              throw new BadRequestException(`You must unlock the previous land slot first.`);
            }
          }

          // Create new land with auto-generated UUID
          const newLand = await tx.land.create({
            data: {
              userId,
              plotIndex: newPlotIndex,
              soilQuality: { fertility: 50, hydration: 50 },
            },
          });
          createdLand = newLand; // Capture for return
        }
      }

      // Record purchase
      const record = await tx.shopPurchase.create({
        data: {
          userId,
          shopType: "GEM",
          itemKey: config.key,
          quantity: 1,
        },
      });

      return {
        record,
        newBalanceGem: user.balanceGem - config.priceGem,
        newBalanceGold: user.balanceGold + (config.reward?.gold || 0),
        newLand: createdLand
      };
    });

    // Emit events
    this.eventEmitter.emit("currency.updated", {
      userId,
      gold: purchase.newBalanceGold, // Gems purchase can give gold
      gem: purchase.newBalanceGem
    });

    if (purchase.newLand) {
      this.eventEmitter.emit("land.updated", {
        userId,
        land: purchase.newLand
      });
    }

    return {
      success: true,
      message: `Purchased ${config.name} successfully`,
      item: config,
      balanceGem: purchase.newBalanceGem,
      balanceGold: purchase.newBalanceGold,
      purchase: purchase.record,
    };
  }

  // ===== CASH SHOP =====

  async getCashShop(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lands: {
          select: { plotIndex: true },
          orderBy: { plotIndex: "asc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const catalog = this.cashItems.map((item) => {
      // Cash items are generally always available unless one-time
      // But now land slots are gone, so just gems.
      return {
        ...item,
        available: true,
      };
    });

    return {
      user: {
        id: user.id,
      },
      items: catalog,
    };
  }

  async purchaseCashShopItem(userId: string, dto: CashShopPurchaseDto) {
    const config = this.cashItems.find((i) => i.key === dto.itemKey);
    if (!config) {
      throw new NotFoundException("Cash shop item not found");
    }

    // TODO: Verify payment with payment provider (Stripe, PayPal, etc.)
    // For now, we'll assume payment is verified

    const purchase = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balanceGem: true,
          lands: {
            select: { plotIndex: true },
            orderBy: { plotIndex: "asc" },
          },
          balanceGold: true // Added for event
        },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Give rewards
      if (config.reward) {
        if (config.reward.gems) {
          await tx.user.update({
            where: { id: userId },
            data: { balanceGem: { increment: config.reward.gems } },
          });
        }
      }

      // Record purchase
      const record = await tx.shopPurchase.create({
        data: {
          userId,
          shopType: "CASH",
          itemKey: config.key,
          quantity: 1,
        },
      });

      return {
        record,
        newBalanceGem: user.balanceGem + (config.reward?.gems || 0),
        userGoldBalance: user.balanceGold // Need for event
      };
    });

    this.eventEmitter.emit("currency.updated", {
      userId,
      gem: purchase.newBalanceGem,
      gold: purchase.userGoldBalance
    });

    return {
      success: true,
      message: `Purchased ${config.name} successfully`,
      item: config,
      balanceGem: purchase.newBalanceGem,
      purchase: purchase.record,
    };
  }
}
