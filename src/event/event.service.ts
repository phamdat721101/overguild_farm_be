import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { FundxApiClient, FundxEvent } from './fundx-api.client';
import { MissionService } from '../mission/mission.service';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly fundxApi: FundxApiClient,
    @Inject(forwardRef(() => MissionService))
    private readonly missionService: MissionService,
  ) {}

  /**
   * Check if event is currently active
   */
  private isEventActive(event: FundxEvent): boolean {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    return now >= startTime && now <= endTime;
  }

  async checkIn(userId: string, dto: CheckInDto) {
    const { eventId, verificationCode } = dto;

    // Fetch event from FundX
    const event = await this.fundxApi.getEventById(eventId);
    
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify event is active (allow check-in before start_time for pending events)
    const now = new Date();
    const endTime = new Date(event.end_time);
    
    if (now > endTime) {
      throw new BadRequestException(
        `Event "${event.name}" has ended. ` +
        `Event ended at: ${event.end_time}`
      );
    }

    // Verify event status
    if (event.status !== 'active' && event.status !== 'pending') {
      throw new BadRequestException(
        `Event "${event.name}" is ${event.status} and cannot accept check-ins`
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
        startTime: event.start_time,
        endTime: event.end_time,
      },
      reward: {
        itemType: 'SEED_COMMON',
        amount: 3,
        totalAmount: seedReward.amount,
      },
    };
  }

  async getActiveEvents() {
    const events = await this.fundxApi.getActiveEvents();
    
    // Filter to only show events that haven't ended yet (include future events)
    const now = new Date();
    const upcomingEvents = events.filter(event => {
      const endTime = new Date(event.end_time);
      return now <= endTime; // Show events that haven't ended
    });

    return upcomingEvents.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      startTime: event.start_time,
      endTime: event.end_time,
      status: event.status,
      coverImage: event.gallery_images?.find(img => img.is_cover)?.image_url,
    }));
  }
}
