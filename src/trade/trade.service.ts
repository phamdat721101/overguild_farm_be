import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AddTradeItemDto } from "./dto/add-trade-item.dto";
import {
  AddTradeCurrencyDto,
  CurrencyType,
} from "./dto/add-trade-currency.dto";
import { CreateListingDto } from "./dto/create-listing.dto";

const TRADE_EXPIRY_MINUTES = 10;

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  constructor(private prisma: PrismaClient) { }

  // ==================== P2P TRADE (Ngọc Rồng style) ====================

  /**
   * Create trade request - bấm vào nhân vật user khác để giao dịch
   */
  async createTradeRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException("Cannot trade with yourself");
    }

    // Check receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true },
    });
    if (!receiver) {
      throw new NotFoundException("User not found");
    }

    // Check no pending trade between them
    const existingTrade = await this.prisma.tradeRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: "PENDING" },
          { senderId, receiverId, status: "ACCEPTED" },
          { senderId: receiverId, receiverId: senderId, status: "PENDING" },
          { senderId: receiverId, receiverId: senderId, status: "ACCEPTED" },
        ],
      },
    });

    if (existingTrade) {
      throw new BadRequestException(
        "Already have an active trade with this user"
      );
    }

    const expiresAt = new Date(Date.now() + TRADE_EXPIRY_MINUTES * 60 * 1000);

    const trade = await this.prisma.tradeRequest.create({
      data: {
        senderId,
        receiverId,
        status: "PENDING",
        expiresAt,
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    this.logger.log(`Trade request created: ${senderId} -> ${receiverId}`);

    return {
      message: "Trade request sent",
      trade,
      expiresIn: TRADE_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Accept trade request - đồng ý giao dịch
   */
  async acceptTradeRequest(userId: string, tradeId: string) {
    const trade = await this.getTradeOrFail(tradeId);

    if (trade.receiverId !== userId) {
      throw new ForbiddenException("Only receiver can accept trade request");
    }

    if (trade.status !== "PENDING") {
      throw new BadRequestException("Trade is not pending");
    }

    if (new Date() > trade.expiresAt) {
      await this.prisma.tradeRequest.update({
        where: { id: tradeId },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException("Trade request has expired");
    }

    const updatedTrade = await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: { status: "ACCEPTED" },
      include: this.tradeInclude,
    });

    this.logger.log(`Trade accepted: ${tradeId}`);

    return {
      message: "Trade accepted. You can now add items.",
      trade: updatedTrade,
    };
  }

  /**
   * Cancel/Reject trade
   */
  async cancelTrade(userId: string, tradeId: string) {
    const trade = await this.getTradeOrFail(tradeId);

    if (trade.senderId !== userId && trade.receiverId !== userId) {
      throw new ForbiddenException("Not part of this trade");
    }

    if (trade.status === "COMPLETED" || trade.status === "CANCELLED") {
      throw new BadRequestException("Trade already finished");
    }

    await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: { status: "CANCELLED" },
    });

    this.logger.log(`Trade cancelled: ${tradeId} by ${userId}`);

    return { message: "Trade cancelled" };
  }

  /**
   * Add item to trade - thêm item vào giao dịch
   */
  async addItemToTrade(userId: string, tradeId: string, dto: AddTradeItemDto) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    // Check user has enough items
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemType: dto.itemType },
    });

    if (!inventoryItem || inventoryItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${inventoryItem?.amount || 0}`
      );
    }

    // Check if already added this item type
    const existingItem = await this.prisma.tradeItem.findFirst({
      where: { tradeId, ownerId: userId, itemType: dto.itemType },
    });

    // Calculate total amount being traded
    const totalInTrade = (existingItem?.amount || 0) + dto.amount;
    if (totalInTrade > inventoryItem.amount) {
      throw new BadRequestException(
        `Cannot add ${dto.amount} more. Already trading ${existingItem?.amount || 0}, you have ${inventoryItem.amount}`
      );
    }

    // Reset confirmations when items change
    await this.resetConfirmations(tradeId);

    if (existingItem) {
      await this.prisma.tradeItem.update({
        where: { id: existingItem.id },
        data: { amount: { increment: dto.amount } },
      });
    } else {
      await this.prisma.tradeItem.create({
        data: {
          tradeId,
          ownerId: userId,
          itemType: dto.itemType,
          amount: dto.amount,
        },
      });
    }

    return this.getTradeDetails(tradeId);
  }

  /**
   * Remove item from trade
   */
  async removeItemFromTrade(
    userId: string,
    tradeId: string,
    itemType: string,
    amount: number
  ) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    const tradeItem = await this.prisma.tradeItem.findFirst({
      where: { tradeId, ownerId: userId, itemType },
    });

    if (!tradeItem) {
      throw new NotFoundException("Item not in trade");
    }

    await this.resetConfirmations(tradeId);

    if (amount >= tradeItem.amount) {
      await this.prisma.tradeItem.delete({ where: { id: tradeItem.id } });
    } else {
      await this.prisma.tradeItem.update({
        where: { id: tradeItem.id },
        data: { amount: { decrement: amount } },
      });
    }

    return this.getTradeDetails(tradeId);
  }

  /**
   * Add currency (gold/gem) to trade
   */
  async addCurrencyToTrade(
    userId: string,
    tradeId: string,
    dto: AddTradeCurrencyDto
  ) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balanceGold: true, balanceGem: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const balance =
      dto.currencyType === CurrencyType.GOLD
        ? user.balanceGold
        : user.balanceGem;

    // Check existing currency in trade
    const existingCurrency = await this.prisma.tradeCurrency.findFirst({
      where: { tradeId, ownerId: userId, currencyType: dto.currencyType },
    });

    const totalInTrade = (existingCurrency?.amount || 0) + dto.amount;
    if (totalInTrade > balance) {
      throw new BadRequestException(
        `Not enough ${dto.currencyType}. You have ${balance}, trying to trade ${totalInTrade}`
      );
    }

    await this.resetConfirmations(tradeId);

    if (existingCurrency) {
      await this.prisma.tradeCurrency.update({
        where: { id: existingCurrency.id },
        data: { amount: { increment: dto.amount } },
      });
    } else {
      await this.prisma.tradeCurrency.create({
        data: {
          tradeId,
          ownerId: userId,
          currencyType: dto.currencyType,
          amount: dto.amount,
        },
      });
    }

    return this.getTradeDetails(tradeId);
  }

  /**
   * Remove currency from trade
   */
  async removeCurrencyFromTrade(
    userId: string,
    tradeId: string,
    currencyType: CurrencyType,
    amount: number
  ) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    const tradeCurrency = await this.prisma.tradeCurrency.findFirst({
      where: { tradeId, ownerId: userId, currencyType },
    });

    if (!tradeCurrency) {
      throw new NotFoundException("Currency not in trade");
    }

    await this.resetConfirmations(tradeId);

    if (amount >= tradeCurrency.amount) {
      await this.prisma.tradeCurrency.delete({
        where: { id: tradeCurrency.id },
      });
    } else {
      await this.prisma.tradeCurrency.update({
        where: { id: tradeCurrency.id },
        data: { amount: { decrement: amount } },
      });
    }

    return this.getTradeDetails(tradeId);
  }

  /**
   * Confirm trade - xác nhận giao dịch (cả 2 bên phải confirm)
   */
  async confirmTrade(userId: string, tradeId: string) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    const isSender = trade.senderId === userId;
    const updateData = isSender
      ? { senderConfirmed: true }
      : { receiverConfirmed: true };

    const updatedTrade = await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: updateData,
      include: this.tradeInclude,
    });

    // Check if both confirmed -> execute trade
    if (updatedTrade.senderConfirmed && updatedTrade.receiverConfirmed) {
      return this.executeTrade(tradeId);
    }

    return {
      message: "Trade confirmed. Waiting for other party.",
      trade: updatedTrade,
      yourConfirmed: true,
      otherConfirmed: isSender
        ? updatedTrade.receiverConfirmed
        : updatedTrade.senderConfirmed,
    };
  }

  /**
   * Unconfirm trade - bỏ xác nhận
   */
  async unconfirmTrade(userId: string, tradeId: string) {
    const trade = await this.getTradeOrFail(tradeId);
    this.validateTradeActive(trade, userId);

    const isSender = trade.senderId === userId;
    const updateData = isSender
      ? { senderConfirmed: false }
      : { receiverConfirmed: false };

    const updatedTrade = await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: updateData,
      include: this.tradeInclude,
    });

    return {
      message: "Trade confirmation removed",
      trade: updatedTrade,
    };
  }

  /**
   * Execute trade - thực hiện giao dịch khi cả 2 confirm
   */
  private async executeTrade(tradeId: string) {
    const trade = await this.prisma.tradeRequest.findUnique({
      where: { id: tradeId },
      include: {
        items: true,
        currencies: true,
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

    const senderItems = trade.items.filter((i) => i.ownerId === trade.senderId);
    const receiverItems = trade.items.filter(
      (i) => i.ownerId === trade.receiverId
    );
    const senderCurrencies = trade.currencies.filter(
      (c) => c.ownerId === trade.senderId
    );
    const receiverCurrencies = trade.currencies.filter(
      (c) => c.ownerId === trade.receiverId
    );

    await this.prisma.$transaction(async (tx) => {
      // Transfer items from sender to receiver
      for (const item of senderItems) {
        await this.transferItem(
          tx,
          trade.senderId,
          trade.receiverId,
          item.itemType,
          item.amount
        );
      }

      // Transfer items from receiver to sender
      for (const item of receiverItems) {
        await this.transferItem(
          tx,
          trade.receiverId,
          trade.senderId,
          item.itemType,
          item.amount
        );
      }

      // Transfer currencies from sender to receiver
      for (const currency of senderCurrencies) {
        await this.transferCurrency(
          tx,
          trade.senderId,
          trade.receiverId,
          currency.currencyType,
          currency.amount
        );
      }

      // Transfer currencies from receiver to sender
      for (const currency of receiverCurrencies) {
        await this.transferCurrency(
          tx,
          trade.receiverId,
          trade.senderId,
          currency.currencyType,
          currency.amount
        );
      }

      // Mark trade as completed
      await tx.tradeRequest.update({
        where: { id: tradeId },
        data: { status: "COMPLETED" },
      });

      // Log the trade
      await tx.tradeLog.create({
        data: {
          tradeId,
          type: "P2P_TRADE",
          user1Id: trade.senderId,
          user2Id: trade.receiverId,
          itemsExchanged: {
            senderGave: senderItems.map((i) => ({
              type: i.itemType,
              amount: i.amount,
            })),
            receiverGave: receiverItems.map((i) => ({
              type: i.itemType,
              amount: i.amount,
            })),
          },
          currenciesExchanged: {
            senderGave: senderCurrencies.map((c) => ({
              type: c.currencyType,
              amount: c.amount,
            })),
            receiverGave: receiverCurrencies.map((c) => ({
              type: c.currencyType,
              amount: c.amount,
            })),
          },
        },
      });
    });

    this.logger.log(`Trade completed: ${tradeId}`);

    return {
      message: "🎉 Trade completed successfully!",
      trade: await this.getTradeDetails(tradeId),
    };
  }

  // ==================== MARKETPLACE (Sạp hàng) ====================

  /**
   * Create market listing - đăng bán item
   */
  async createListing(userId: string, dto: CreateListingDto) {
    if (!dto.priceGold && !dto.priceGem) {
      throw new BadRequestException("Must set price in Gold or Gem");
    }

    // Check user has enough items
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemType: dto.itemType },
    });

    if (!inventoryItem || inventoryItem.amount < dto.amount) {
      throw new BadRequestException(
        `Not enough ${dto.itemType}. You have ${inventoryItem?.amount || 0}`
      );
    }

    // Deduct items from inventory (lock them)
    if (inventoryItem.amount === dto.amount) {
      await this.prisma.inventoryItem.delete({
        where: { id: inventoryItem.id },
      });
    } else {
      await this.prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { amount: { decrement: dto.amount } },
      });
    }

    const listing = await this.prisma.marketListing.create({
      data: {
        sellerId: userId,
        itemType: dto.itemType,
        amount: dto.amount,
        priceGold: dto.priceGold,
        priceGem: dto.priceGem,
        status: "ACTIVE",
      },
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
      },
    });

    this.logger.log(`Listing created: ${listing.id} by ${userId}`);

    return {
      message: "Item listed on marketplace",
      listing,
    };
  }

  /**
   * Cancel listing - hủy đăng bán
   */
  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.marketListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException("Not your listing");
    }

    if (listing.status !== "ACTIVE") {
      throw new BadRequestException("Listing is not active");
    }

    // Return items to seller
    await this.addItemToInventory(userId, listing.itemType, listing.amount);

    await this.prisma.marketListing.update({
      where: { id: listingId },
      data: { status: "CANCELLED" },
    });

    return { message: "Listing cancelled, items returned" };
  }

  /**
   * Buy from marketplace - mua từ sạp hàng
   */
  async buyListing(
    buyerId: string,
    listingId: string,
    payWithGem: boolean = false
  ) {
    const listing = await this.prisma.marketListing.findUnique({
      where: { id: listingId },
      include: {
        seller: { select: { id: true, username: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.status !== "ACTIVE") {
      throw new BadRequestException("Listing is not available");
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException("Cannot buy your own listing");
    }

    const price = payWithGem ? listing.priceGem : listing.priceGold;
    const currencyType = payWithGem ? "GEM" : "GOLD";

    if (!price) {
      throw new BadRequestException(
        `This listing doesn't accept ${currencyType}`
      );
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { balanceGold: true, balanceGem: true },
    });

    if (!buyer) {
      throw new NotFoundException("Buyer not found");
    }

    const balance = payWithGem ? buyer.balanceGem : buyer.balanceGold;
    if (balance < price) {
      throw new BadRequestException(
        `Not enough ${currencyType}. Need ${price}, have ${balance}`
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Deduct currency from buyer
      const updateField = payWithGem
        ? { balanceGem: { decrement: price } }
        : { balanceGold: { decrement: price } };
      await tx.user.update({ where: { id: buyerId }, data: updateField });

      // Add currency to seller
      const sellerUpdateField = payWithGem
        ? { balanceGem: { increment: price } }
        : { balanceGold: { increment: price } };
      await tx.user.update({
        where: { id: listing.sellerId },
        data: sellerUpdateField,
      });

      // Add item to buyer
      await this.addItemToInventoryTx(
        tx,
        buyerId,
        listing.itemType,
        listing.amount
      );

      // Update listing
      await tx.marketListing.update({
        where: { id: listingId },
        data: {
          status: "SOLD",
          buyerId,
          soldAt: new Date(),
        },
      });

      // Log
      await tx.tradeLog.create({
        data: {
          listingId,
          type: "MARKET_PURCHASE",
          user1Id: buyerId,
          user2Id: listing.sellerId,
          itemsExchanged: { item: listing.itemType, amount: listing.amount },
          currenciesExchanged: { type: currencyType, amount: price },
        },
      });
    });

    this.logger.log(`Listing ${listingId} bought by ${buyerId}`);

    return {
      message: `🛒 Purchased ${listing.amount}x ${listing.itemType} for ${price} ${currencyType}`,
      item: { type: listing.itemType, amount: listing.amount },
      paid: { type: currencyType, amount: price },
    };
  }

  /**
   * Get marketplace listings
   */
  async getListings(filters?: { itemType?: string; sellerId?: string }) {
    const where: any = { status: "ACTIVE" };
    if (filters?.itemType) where.itemType = filters.itemType;
    if (filters?.sellerId) where.sellerId = filters.sellerId;

    const listings = await this.prisma.marketListing.findMany({
      where,
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return listings;
  }

  /**
   * Get my listings
   */
  async getMyListings(userId: string) {
    return this.prisma.marketListing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get active trades for user
   */
  async getActiveTrades(userId: string) {
    return this.prisma.tradeRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: this.tradeInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get trade history
   */
  async getTradeHistory(userId: string, limit = 20) {
    return this.prisma.tradeLog.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  // ==================== HELPERS ====================

  private tradeInclude = {
    sender: { select: { id: true, username: true, avatar: true } },
    receiver: { select: { id: true, username: true, avatar: true } },
    items: true,
    currencies: true,
  };

  private async getTradeOrFail(tradeId: string) {
    const trade = await this.prisma.tradeRequest.findUnique({
      where: { id: tradeId },
      include: this.tradeInclude,
    });

    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

    return trade;
  }

  private async getTradeDetails(tradeId: string) {
    const trade = await this.prisma.tradeRequest.findUnique({
      where: { id: tradeId },
      include: this.tradeInclude,
    });

    if (!trade) {
      throw new NotFoundException("Trade not found");
    }

    const senderItems = trade.items.filter((i) => i.ownerId === trade.senderId);
    const receiverItems = trade.items.filter(
      (i) => i.ownerId === trade.receiverId
    );
    const senderCurrencies = trade.currencies.filter(
      (c) => c.ownerId === trade.senderId
    );
    const receiverCurrencies = trade.currencies.filter(
      (c) => c.ownerId === trade.receiverId
    );

    return {
      ...trade,
      senderOffer: { items: senderItems, currencies: senderCurrencies },
      receiverOffer: { items: receiverItems, currencies: receiverCurrencies },
    };
  }

  private validateTradeActive(trade: any, userId: string) {
    if (trade.senderId !== userId && trade.receiverId !== userId) {
      throw new ForbiddenException("Not part of this trade");
    }

    if (trade.status !== "ACCEPTED") {
      throw new BadRequestException("Trade must be accepted first");
    }

    if (new Date() > trade.expiresAt) {
      throw new BadRequestException("Trade has expired");
    }
  }

  private async resetConfirmations(tradeId: string) {
    await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: { senderConfirmed: false, receiverConfirmed: false },
    });
  }

  private async transferItem(
    tx: any,
    fromId: string,
    toId: string,
    itemType: string,
    amount: number
  ) {
    // Deduct from sender
    const senderItem = await tx.inventoryItem.findFirst({
      where: { userId: fromId, itemType },
    });

    if (senderItem.amount === amount) {
      await tx.inventoryItem.delete({ where: { id: senderItem.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: senderItem.id },
        data: { amount: { decrement: amount } },
      });
    }

    // Add to receiver
    await this.addItemToInventoryTx(tx, toId, itemType, amount);
  }

  private async transferCurrency(
    tx: any,
    fromId: string,
    toId: string,
    currencyType: string,
    amount: number
  ) {
    const field = currencyType === "GOLD" ? "balanceGold" : "balanceGem";

    await tx.user.update({
      where: { id: fromId },
      data: { [field]: { decrement: amount } },
    });

    await tx.user.update({
      where: { id: toId },
      data: { [field]: { increment: amount } },
    });
  }

  private async addItemToInventory(
    userId: string,
    itemType: string,
    amount: number
  ) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { userId, itemType },
    });

    if (existing) {
      await this.prisma.inventoryItem.update({
        where: { id: existing.id },
        data: { amount: { increment: amount } },
      });
    } else {
      await this.prisma.inventoryItem.create({
        data: { userId, itemType, amount },
      });
    }
  }

  private async addItemToInventoryTx(
    tx: any,
    userId: string,
    itemType: string,
    amount: number
  ) {
    const existing = await tx.inventoryItem.findFirst({
      where: { userId, itemType },
    });

    if (existing) {
      await tx.inventoryItem.update({
        where: { id: existing.id },
        data: { amount: { increment: amount } },
      });
    } else {
      await tx.inventoryItem.create({
        data: { userId, itemType, amount },
      });
    }
  }
}
