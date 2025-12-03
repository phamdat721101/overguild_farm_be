import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LandService } from './land.service';
import { AssignSeedDto } from './dto/assign-seed.dto';

@ApiTags('Land (Legacy)')
@Controller('land')
export class LandController {
  constructor(private readonly landService: LandService) {}

  @Get(':wallet')
  @ApiOperation({ 
    summary: 'Get land by wallet address (Legacy)',
    description: '⚠️ DEPRECATED: Prefer using GET /user/profile or GET /garden instead.',
    deprecated: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns land data in legacy format',
    schema: {
      example: {
        id: 'land-uuid',
        wallet_address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb',
        plot_index: 0,
        soil_quality: { fertility: 50, hydration: 50 },
        seed_type: 'SOCIAL',
        growth_stage: 'seeded',
        growth_points: 0,
        task_status: {},
        planted_at: '2025-12-03T04:00:00.000Z',
        last_progress_at: '2025-12-03T04:00:00.000Z',
        ready_at: null,
        bounty_claimed_at: null,
        metadata: {},
        created_at: '2025-12-03T04:00:00.000Z',
        updated_at: '2025-12-03T04:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User or land not found' })
  getLand(@Param('wallet') wallet: string) {
    return this.landService.getLand(wallet);
  }

  @Post('assign-seed')
  @ApiOperation({ 
    summary: 'Assign seed to land (Legacy)',
    description: '⚠️ DEPRECATED: Prefer using POST /plant/plant instead for better features.',
    deprecated: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Seed assigned successfully'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Land already has a plant or invalid seed type'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User or land not found'
  })
  assignSeed(@Body() dto: AssignSeedDto) {
    return this.landService.assignSeed(dto);
  }
}
