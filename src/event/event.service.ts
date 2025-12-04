import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { FundxEvent } from './fundx-api.client';
import { MissionService } from '../mission/mission.service';

interface RewardBoxItem {
  itemType: string;
  amount: number;
  rarity: string;
  probability: number; // percentage
  icon: string;
  name: string;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  // Meetup reward box drop rates (total = 100%)
  private readonly REWARD_BOX_TABLE: RewardBoxItem[] = [
    { itemType: 'SEED_TREE', amount: 1, rarity: 'LEGENDARY', probability: 3, icon: '🌳', name: 'Tree Seed (NFT)' },
    { itemType: 'FERTILIZER_RARE', amount: 1, rarity: 'RARE', probability: 5, icon: '💊', name: 'Growth Potion (Rare)' },
    { itemType: 'SEED_MUSHROOM', amount: 2, rarity: 'RARE', probability: 10, icon: '🍄🍄', name: '2x Mushroom Spores' },
    { itemType: 'SEED_MUSHROOM', amount: 1, rarity: 'RARE', probability: 15, icon: '🍄', name: '1x Mushroom Spore' },
    { itemType: 'SEED_ALGAE', amount: 3, rarity: 'COMMON', probability: 20, icon: '🌿🌿🌿', name: '3x Algae Sprouts' },
    { itemType: 'GEM', amount: 50, rarity: 'EPIC', probability: 12, icon: '💎', name: '50 Gems' },
    { itemType: 'GOLD', amount: 300, rarity: 'COMMON', probability: 35, icon: '🪙', name: '300 Gold' },
  ];

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
  ) {}

  /**
   * Check if external FundX event is currently active (legacy helper)
   */
  private isEventActive(event: FundxEvent): boolean {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    return now >= startTime && now <= endTime;
  }

  async createEvent(creatorWallet: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        location: dto.location,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        creatorWallet: dto.creatorWallet, // ✅ This will now work after migration
      },
    });

    this.logger.log(`Created event "${event.name}" (${event.id})`);
    return event;
  }

  /**
   * Check in to event - gives reward box + water
   */
  async checkIn(userId: string, dto: CheckInDto) {
    const { eventId, verificationCode } = dto;

    // Fetch event from local DB
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify event is active by time window
    const now = new Date();
    if (now > event.endTime) {
      throw new BadRequestException(
        `Event "${event.name}" has ended. Event ended at: ${event.endTime.toISOString()}`,
      );
    }

    // Optional: Verify verification code if provided
    // (FundX doesn't have this field yet, but can be added later)
    if (verificationCode) {
      // Could validate against event.secret_code if FundX adds it
      this.logger.log(`Verification code provided: ${verificationCode}`);
    }

    // Check if user already checked in to this event (prevent duplicates)
    const existingCheckIn = await this.prisma.inventoryItem.findFirst({
      where: {
        userId,
        itemType: `EVENT_CHECKIN_${eventId}`,
      },
    });

    if (existingCheckIn) {
      throw new BadRequestException(
        `You have already checked in to "${event.name}"`
      );
    }

    // Give reward box token (unopened)
    const boxToken = await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: {
          userId,
          itemType: `REWARD_BOX_${eventId}`,
        },
      },
      create: {
        userId,
        itemType: `REWARD_BOX_${eventId}`,
        amount: 1,
      },
      update: {
        amount: { increment: 1 },
      },
    });

    // ✅ Give daily water for check-in
    await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: { userId, itemType: 'WATER' },
      },
      create: {
        userId,
        itemType: 'WATER',
        amount: 3,
      },
      update: {
        amount: { increment: 3 },
      },
    });

    // Mark check-in to prevent duplicates
    await this.prisma.inventoryItem.create({
      data: {
        userId,
        itemType: `EVENT_CHECKIN_${eventId}`,
        amount: 1,
      },
    });

    this.logger.log(
      `User ${userId} checked in to "${event.name}" (${eventId}), received reward box + 3 water`,
    );

    // Track mission progress
    try {
      await this.missionService.trackEventCheckIn(userId, new Date());
      this.logger.log(`Mission progress updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update mission progress: ${error.message}`);
    }

    return {
      success: true,
      event: {
        id: event.id,
        name: event.name,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      rewards: [
        {
          itemType: `REWARD_BOX_${eventId}`,
          amount: 1,
          message: '🎁 Reward box received!',
        },
        {
          itemType: 'WATER',
          amount: 3,
          message: '💧 3 water drops received!',
        },
      ],
      message: '✅ Checked in successfully! Received 1 reward box + 3 water drops',
    };
  }

  /**
   * Open reward box - weighted random selection
   */
  async openRewardBox(userId: string, eventId: string) {
    // Check if user has the reward box
    const boxItem = await this.prisma.inventoryItem.findUnique({
      where: {
        userId_itemType: {
          userId,
          itemType: `REWARD_BOX_${eventId}`,
        },
      },
    });

    if (!boxItem || boxItem.amount < 1) {
      throw new BadRequestException('You do not have a reward box for this event');
    }

    // Get event info
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Roll reward using weighted random
    const reward = this.rollReward();

    // Consume reward box
    if (boxItem.amount === 1) {
      await this.prisma.inventoryItem.delete({
        where: { id: boxItem.id },
      });
    } else {
      await this.prisma.inventoryItem.update({
        where: { id: boxItem.id },
        data: { amount: { decrement: 1 } },
      });
    }

    // Give reward to user
    await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: {
          userId,
          itemType: reward.itemType,
        },
      },
      create: {
        userId,
        itemType: reward.itemType,
        amount: reward.amount,
      },
      update: {
        amount: { increment: reward.amount },
      },
    });

    this.logger.log(
      `User ${userId} opened reward box for event ${eventId}, got: ${reward.amount}x ${reward.itemType} (${reward.rarity})`,
    );

    return {
      success: true,
      event: {
        id: event.id,
        name: event.name,
      },
      reward: {
        itemType: reward.itemType,
        itemName: reward.name,
        amount: reward.amount,
        rarity: reward.rarity,
        icon: reward.icon,
        probability: reward.probability,
      },
      message: `🎉 You got ${reward.icon} ${reward.amount}x ${reward.name}!`,
    };
  }

  /**
   * Weighted random selection based on probability table
   */
  private rollReward(): RewardBoxItem {
    // Generate random number 0-100
    const roll = Math.random() * 100;
    
    let cumulativeProbability = 0;
    
    for (const item of this.REWARD_BOX_TABLE) {
      cumulativeProbability += item.probability;
      
      if (roll < cumulativeProbability) {
        return item;
      }
    }
    
    // Fallback (should never reach here if probabilities sum to 100)
    return this.REWARD_BOX_TABLE[this.REWARD_BOX_TABLE.length - 1];
  }

  /**
   * Get reward box drop rates (for display to users)
   */
  getRewardBoxRates() {
    return {
      dropRates: this.REWARD_BOX_TABLE.map(item => ({
        itemName: item.name,
        itemType: item.itemType,
        amount: item.amount,
        rarity: item.rarity,
        probability: item.probability,
        icon: item.icon,
      })),
      totalProbability: this.REWARD_BOX_TABLE.reduce((sum, item) => sum + item.probability, 0),
    };
  }

  async getActiveEvents() {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
    });

    return events;
  }

  async getEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
