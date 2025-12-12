import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryService } from "../inventory/inventory.service";
import { ITEM_TYPES } from "../inventory/constants/item-types";
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

@Injectable()
export class ShopService {
  private readonly goldItems = GOLD_SHOP_ITEMS;
  private readonly gemItems = GEM_SHOP_ITEMS;
  private readonly cashItems = CASH_SHOP_ITEMS;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventoryService: InventoryService
  ) {}

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
      const limitInfo = limits[key] || {
        purchased: 0,
        remaining: item.limitPerPeriod ?? null,
      };
      const affordable = user.balanceGold >= item.priceGold;

      return {
        ...item,
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
        select: { id: true, balanceGold: true },
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

      // Check gold balance
      if (user.balanceGold < config.priceGold) {
        throw new BadRequestException(
          `Not enough gold. Required ${config.priceGold}, you have ${user.balanceGold}`
        );
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
        data: { balanceGold: { decrement: config.priceGold } },
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

      return { record, newBalanceGold: user.balanceGold - config.priceGold };
    });

    return {
      success: true,
      message: `Purchased ${config.name} successfully`,
      item: config,
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
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const catalog = this.gemItems.map((item) => {
      const affordable = user.balanceGem >= item.priceGem;
      return {
        ...item,
        affordable,
      };
    });

    return {
      user: {
        id: user.id,
        balanceGem: user.balanceGem,
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
      };
    });

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

    const currentLandSlots = user.lands.length;
    const maxLandSlot = Math.max(...user.lands.map((l) => l.plotIndex), 0) + 1;

    const catalog = this.cashItems.map((item) => {
      let available = true;

      // Check if land slot is already owned
      if (item.reward?.landSlot) {
        available = item.reward.landSlot > maxLandSlot;
      }

      return {
        ...item,
        available,
        currentLandSlots,
        maxLandSlot,
      };
    });

    return {
      user: {
        id: user.id,
        currentLandSlots,
        maxLandSlot,
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

        if (config.reward.landSlot) {
          const maxPlotIndex = Math.max(
            ...user.lands.map((l) => l.plotIndex),
            -1
          );
          const newPlotIndex = config.reward.landSlot - 1; // Convert to 0-based index

          if (newPlotIndex <= maxPlotIndex) {
            throw new BadRequestException("Land slot already owned");
          }

          await tx.land.create({
            data: {
              userId,
              plotIndex: newPlotIndex,
              soilQuality: { fertility: 50, hydration: 50 },
            },
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
      };
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
