import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MissionService } from './mission.service';

@ApiTags('missions')
@Controller('missions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all missions for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of missions with progress and rewards',
    schema: {
      example: [
        {
          id: 'uuid',
          type: 'DAILY_CHECKIN',
          name: 'Daily Check-in',
          description: 'Check in to 1 event today',
          progress: 0,
          target: 1,
          status: 'active',
          reward: {
            xp: 10,
            reputation: 5,
            items: [{ type: 'SEED_COMMON', amount: 1 }],
          },
          resetPeriod: 'daily',
          createdAt: '2025-11-27T...',
          updatedAt: '2025-11-27T...',
        },
      ],
    },
  })
  async getMissions(@CurrentUser('sub') userId: string) {
    return this.missionService.getUserMissions(userId);
  }

  @Post(':missionId/claim')
  @ApiOperation({ summary: 'Claim rewards for a completed mission' })
  @ApiResponse({
    status: 200,
    description: 'Mission rewards claimed successfully',
    schema: {
      example: {
        success: true,
        mission: {
          id: 'uuid',
          type: 'DAILY_CHECKIN',
          name: 'Daily Check-in',
        },
        rewards: {
          xp: 10,
          reputation: 5,
          items: [{ type: 'SEED_COMMON', amount: 1 }],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Mission not completed or already claimed' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async claimReward(
    @CurrentUser('sub') userId: string,
    @Param('missionId') missionId: string,
  ) {
    return this.missionService.claimReward(userId, missionId);
  }
}

