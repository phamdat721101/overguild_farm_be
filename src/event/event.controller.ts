import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventService } from './event.service';
import { CheckInDto } from './dto/check-in.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { AdminCheckInDto } from './dto/admin-check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('create')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (admin/organizer)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async createEvent(
    @CurrentUser('walletAddress') creatorWallet: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventService.createEvent(creatorWallet, dto);
  }

  @Post('check-in')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check in to an event',
    description: 'Check in to an active event and receive a reward box to open',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully checked in, reward box received',
    schema: {
      example: {
        success: true,
        event: {
          id: 'event-uuid',
          name: 'OverGuild Bangkok Meetup',
          location: 'Bangkok, Thailand',
          startTime: '2025-12-03T10:00:00.000Z',
          endTime: '2025-12-03T18:00:00.000Z',
        },
        reward: {
          itemType: 'REWARD_BOX_event-uuid',
          amount: 1,
          message: '🎁 You received a reward box! Open it to see what you got!',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Already checked in or event ended' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async checkIn(
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.eventService.checkIn(userId, dto);
  }

  @Post(':eventId/open-box')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Open reward box from event check-in',
    description: 'Open your reward box to reveal random rewards with weighted probabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Reward box opened successfully',
    schema: {
      example: {
        success: true,
        event: {
          id: 'event-uuid',
          name: 'OverGuild Bangkok Meetup',
        },
        reward: {
          itemType: 'SEED_MUSHROOM',
          itemName: '2x Mushroom Spores',
          amount: 2,
          rarity: 'RARE',
          icon: '🍄🍄',
          probability: 10,
        },
        message: '🎉 You got 🍄🍄 2x 2x Mushroom Spores!',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No reward box available' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async openRewardBox(
    @CurrentUser('sub') userId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.openRewardBox(userId, eventId);
  }

  @Get('reward-rates')
  @ApiOperation({
    summary: 'Get reward box drop rates',
    description: 'View the probability table for reward box contents',
  })
  @ApiResponse({
    status: 200,
    description: 'Reward drop rates',
    schema: {
      example: {
        dropRates: [
          { itemName: 'Tree Seed (NFT)', itemType: 'SEED_TREE', amount: 1, rarity: 'LEGENDARY', probability: 3, icon: '🌳' },
          { itemName: 'Growth Potion (Rare)', itemType: 'FERTILIZER_RARE', amount: 1, rarity: 'RARE', probability: 5, icon: '💊' },
          { itemName: '2x Mushroom Spores', itemType: 'SEED_MUSHROOM', amount: 2, rarity: 'RARE', probability: 10, icon: '🍄🍄' },
          { itemName: '1x Mushroom Spore', itemType: 'SEED_MUSHROOM', amount: 1, rarity: 'RARE', probability: 15, icon: '🍄' },
          { itemName: '3x Algae Sprouts', itemType: 'SEED_ALGAE', amount: 3, rarity: 'COMMON', probability: 20, icon: '🌿🌿🌿' },
          { itemName: '50 Gems', itemType: 'GEM', amount: 50, rarity: 'EPIC', probability: 12, icon: '💎' },
          { itemName: '300 Gold', itemType: 'GOLD', amount: 300, rarity: 'COMMON', probability: 35, icon: '🪙' },
        ],
        totalProbability: 100,
      },
    },
  })
  getRewardRates() {
    return this.eventService.getRewardBoxRates();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active/upcoming events' })
  @ApiResponse({ status: 200, description: 'Returns list of active events' })
  async getActiveEvents() {
    return this.eventService.getActiveEvents();
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiResponse({ status: 200, description: 'Returns event detail' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventById(@Param('eventId') eventId: string) {
    return this.eventService.getEventById(eventId);
  }

  @Post(':eventId/admin-check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin check-in user by scanning QR',
    description:
      'Used by event admin: scan user QR (from /user/qr), extract userId, and call this endpoint to check them in to the event.',
  })
  @ApiResponse({ status: 200, description: 'User successfully checked in by admin' })
  @ApiResponse({ status: 400, description: 'User already checked in or event invalid' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async adminCheckIn(
    @Param('eventId') eventId: string,
    @Body() dto: AdminCheckInDto,
  ) {
    // Re-use existing check-in logic, but with target userId scanned from QR
    return this.eventService.checkIn(dto.userId, {
      eventId,
      verificationCode: dto.verificationCode,
    });
  }
}

