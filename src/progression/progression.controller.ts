import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressionService } from './progression.service';
import { ClaimLevelDto } from './dto/claim-level.dto';

@ApiTags('Progression')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get()
  @ApiOperation({ summary: 'Get XP & level progression for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns current XP, level and level table',
    schema: {
      example: {
        xp: 250,
        level: 3,
        nextLevelXp: 500,
        xpToNextLevel: 250,
        levels: [
          {
            level: 1,
            requiredXp: 0,
            rewards: {},
            claimed: true,
            reachable: true,
          },
          {
            level: 2,
            requiredXp: 100,
            rewards: { items: [{ type: 'SEED_COMMON', amount: 1 }] },
            claimed: true,
            reachable: true,
          },
          {
            level: 3,
            requiredXp: 250,
            rewards: { items: [{ type: 'FERTILIZER_BASIC', amount: 1 }] },
            claimed: false,
            reachable: true,
          },
        ],
      },
    },
  })
  getProgress(@CurrentUser('sub') userId: string): Promise<any> {
    return this.progressionService.getUserProgress(userId);
  }

  @Post('claim-level')
  @ApiOperation({
    summary: 'Claim level-up rewards',
    description:
      'Claim rewards for a specific level. User must have enough XP and not have claimed this level before.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated progression after claiming rewards',
  })
  claimLevel(@CurrentUser('sub') userId: string, @Body() dto: ClaimLevelDto): Promise<any> {
    return this.progressionService.claimLevelReward(userId, dto.level);
  }
}


