import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InventoryService } from "../inventory/inventory.service";
import { ITEM_TYPES } from "../inventory/constants/item-types";
import { GOLD_SHOP_ITEMS, GoldShopItemKey } from "./shop.constants";
import { GoldShopPurchaseDto } from "./dto/gold-shop-purchase.dto";

@Injectable()
export class ShopService {
  private readonly items = GOLD_SHOP_ITEMS;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventoryService: InventoryService,
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

    const catalog = this.items.map((item) => {
      const key = item.key;
      const limitInfo = limits[key] || { purchased: 0, remaining: item.limitPerPeriod ?? null };
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
    const config = this.items.find((i) => i.key === dto.itemKey);
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
            `Purchase limit reached for ${config.name} (${config.limitPerPeriod} per ${config.period.toLowerCase()})`,
          );
        }
      }

      // Check gold balance
      if (user.balanceGold < config.priceGold) {
        throw new BadRequestException(
          `Not enough gold. Required ${config.priceGold}, you have ${user.balanceGold}`,
        );
      }

      // Handle special exchange item
      if (config.key === GoldShopItemKey.EXCHANGE_SPORE_MUSHROOM) {
        // Require 5 FRUIT_ALGAE -> give 1 FRUIT_MUSHROOM
        const hasSpores = await this.inventoryService.hasItemAmount(
          userId,
          ITEM_TYPES.FRUIT_ALGAE,
          5,
        );
        if (!hasSpores) {
          throw new BadRequestException(
            "Not enough Algae Spores (FRUIT_ALGAE). You need at least 5 to exchange.",
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

    for (const item of this.items) {
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
}


