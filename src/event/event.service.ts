import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { FundxEvent } from './fundx-api.client';
import { MissionService } from '../mission/mission.service';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly prisma: PrismaClient,
    // Giữ FundxApiClient cho tương lai nếu cần sync với FundX, hiện tại không dùng
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
    // Lưu event vào bảng local `events`
    const event = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        location: dto.location,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });

    this.logger.log(
      `Created local event "${event.name}" (${event.id}) by wallet ${creatorWallet.toLowerCase()}`,
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

    // Reward: Add 3 SEED_COMMON to inventory
    const seedReward = await this.prisma.inventoryItem.upsert({
      where: {
        userId_itemType: {
          userId,
          itemType: 'SEED_COMMON',
        },
      },
      create: {
        userId,
        itemType: 'SEED_COMMON',
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
      `User ${userId} checked in to "${event.name}" (${eventId}), received 3 seeds`,
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
        itemType: 'SEED_COMMON',
        amount: 3,
        totalAmount: seedReward.amount,
      },
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
        startTime: 'asc',
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
