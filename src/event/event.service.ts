import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CheckInDto } from "./dto/check-in.dto";
import { CreateEventDto } from "./dto/create-event.dto";
import { OfflineCheckInDto } from "./dto/offline-check-in.dto";
import { FundxEvent } from "./fundx-api.client";
import { MissionService } from "../mission/mission.service";

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  // Offline meetup reward box drop rates (matching image spec)
  private readonly OFFLINE_REWARD_TABLE = [
    { itemType: "SEED_TREE", amount: 1, probability: 3, name: "SEED (Hạt Giống)", icon: "🌳" },
    { itemType: "FERTILIZER_RARE", amount: 1, probability: 5, name: "Thuốc Tăng Trưởng Trung Cấp", icon: "💊" },
    { itemType: "SEED_MUSHROOM", amount: 2, probability: 10, name: "Bào Tử Nấm x2", icon: "🍄🍄" },
    { itemType: "SEED_MUSHROOM", amount: 1, probability: 15, name: "Bào Tử Nấm x1", icon: "🍄" },
    { itemType: "SEED_ALGAE", amount: 3, probability: 20, name: "Mầm Tảo x3", icon: "🌿🌿🌿" },
    { itemType: "GEM", amount: 50, probability: 12, name: "Gem x50", icon: "💎" },
    { itemType: "GOLD", amount: 300, probability: 35, name: "Vàng x300", icon: "🪙" },
  ];

  // Valid offline check-in codes (can be moved to database later)
  private readonly VALID_CODES = new Map<string, { eventName: string; expiresAt: Date }>([
    ["BANGKOK2025", { eventName: "OverGuild Bangkok Meetup", expiresAt: new Date("2025-12-31") }],
    ["SAIGON2025", { eventName: "OverGuild Saigon Meetup", expiresAt: new Date("2025-12-31") }],
    ["HANOI2025", { eventName: "OverGuild Hanoi Meetup", expiresAt: new Date("2025-12-31") }],
    ["TESTCODE", { eventName: "Test Event", expiresAt: new Date("2030-12-31") }],
  ]);

  constructor(
    private readonly prisma: PrismaClient,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService
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
    // Lưu event vào bảng local `events`
    const event = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        location: dto.location,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        creatorWallet: creatorWallet.toLowerCase(),
      },
    });

    this.logger.log(
      `Created local event "${event.name}" (${event.id}) by wallet ${creatorWallet.toLowerCase()}`
    );

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
    };
  }

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
        `Event "${event.name}" has ended. Event ended at: ${event.endTime.toISOString()}`
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

    // Reward: Add 3 SEED_COMMON to inventory
    const seedReward = await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: {
          userId,
          itemType: "SEED_COMMON",
        },
      },
      create: {
        userId,
        itemType: "SEED_COMMON",
        amount: 3,
      },
      update: {
        amount: { increment: 3 },
      },
    });

    // Mark check-in (to prevent duplicates)
    await this.prisma.inventoryItem.create({
      data: {
        userId,
        itemType: `EVENT_CHECKIN_${eventId}`,
        amount: 1,
      },
    });

    this.logger.log(
      `User ${userId} checked in to "${event.name}" (${eventId}), received 3 seeds`
    );

    // Track mission progress
    try {
      await this.missionService.trackEventCheckIn(userId, new Date());
      this.logger.log(`Mission progress updated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update mission progress: ${error.message}`);
      // Don't fail check-in if mission tracking fails
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
      reward: {
        itemType: "SEED_COMMON",
        amount: 3,
        totalAmount: seedReward.amount,
      },
    };
  }

  /**
   * ✅ NEW: Offline check-in with code only (no event ID required)
   * Returns reward box with random items based on drop rates
   */
  async offlineCheckIn(userId: string, dto: OfflineCheckInDto) {
    const { code } = dto;
    const upperCode = code.toUpperCase();

    // Validate code
    const codeData = this.VALID_CODES.get(upperCode);
    if (!codeData) {
      throw new BadRequestException(
        `Invalid check-in code. Please check with event organizer.`
      );
    }

    // Check if code is expired
    const now = new Date();
    if (now > codeData.expiresAt) {
      throw new BadRequestException(
        `This check-in code has expired on ${codeData.expiresAt.toISOString()}`
      );
    }

    // Check if user already used this code
    const existingCheckIn = await this.prisma.inventoryItem.findFirst({
      where: {
        userId,
        itemType: `OFFLINE_CHECKIN_${upperCode}`,
      },
    });

    if (existingCheckIn) {
      throw new BadRequestException(
        `You have already checked in with this code. Each code can only be used once.`
      );
    }

    // Roll reward from drop table
    const reward = this.rollOfflineReward();

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

    // Mark code as used
    await this.prisma.inventoryItem.create({
      data: {
        userId,
        itemType: `OFFLINE_CHECKIN_${upperCode}`,
        amount: 1,
      },
    });

    this.logger.log(
      `User ${userId} offline check-in with code ${upperCode} (${codeData.eventName}), got: ${reward.amount}x ${reward.itemType}`
    );

    // Track mission progress
    try {
      await this.missionService.trackEventCheckIn(userId, new Date());
    } catch (error) {
      this.logger.error(`Failed to update mission progress: ${error.message}`);
    }

    return {
      success: true,
      event: {
        name: codeData.eventName,
        code: upperCode,
      },
      reward: {
        itemType: reward.itemType,
        itemName: reward.name,
        amount: reward.amount,
        icon: reward.icon,
        probability: reward.probability,
      },
      message: `🎉 Check-in successful! You got ${reward.icon} ${reward.amount}x ${reward.name}!`,
    };
  }

  /**
   * Weighted random selection for offline rewards
   */
  private rollOfflineReward() {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const item of this.OFFLINE_REWARD_TABLE) {
      cumulative += item.probability;
      if (roll < cumulative) {
        return item;
      }
    }

    // Fallback
    return this.OFFLINE_REWARD_TABLE[this.OFFLINE_REWARD_TABLE.length - 1];
  }

  /**
   * Get offline reward drop rates
   */
  getOfflineRewardRates() {
    return {
      dropRates: this.OFFLINE_REWARD_TABLE.map((item) => ({
        itemName: item.name,
        itemType: item.itemType,
        amount: item.amount,
        probability: `${item.probability}%`,
        icon: item.icon,
      })),
      totalProbability: this.OFFLINE_REWARD_TABLE.reduce(
        (sum, item) => sum + item.probability,
        0
      ),
    };
  }

  async getActiveEvents() {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        endTime: {
          gte: now,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
    }));
  }

  async getEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
    };
  }
}
