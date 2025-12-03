import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FertilizerService } from './fertilizer.service';
import { ApplyFertilizerDto } from './dto/apply-fertilizer.dto';
import { CompostDto } from './dto/compost.dto';

@ApiTags('Fertilizer')
@ApiBearerAuth('JWT-auth')
@Controller('fertilizer')
@UseGuards(JwtAuthGuard)
export class FertilizerController {
  constructor(private readonly fertilizerService: FertilizerService) {}

  @Get('inventory')
  @ApiOperation({ 
    summary: 'Get fertilizer inventory',
    description: 'Get all fertilizers in user inventory'
  })
  @ApiResponse({
    status: 200,
    description: 'Fertilizer inventory',
    schema: {
      example: {
        fertilizers: [
          { type: 'FERTILIZER_COMMON', amount: 5, rarity: 'COMMON' },
          { type: 'FERTILIZER_RARE', amount: 2, rarity: 'RARE' },
        ],
        total: 7,
      },
    },
  })
  getInventory(@CurrentUser('sub') userId: string) {
    return this.fertilizerService.getFertilizerInventory(userId);
  }

  @Post('apply')
  @ApiOperation({ 
    summary: 'Apply fertilizer to a plant',
    description: 'Apply fertilizer to boost plant growth and improve soil quality'
  })
  @ApiResponse({
    status: 200,
    description: 'Fertilizer applied successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No plant on land, plant is dead, or insufficient fertilizer',
  })
  @ApiResponse({
    status: 404,
    description: 'Land not found',
  })
  applyFertilizer(
    @CurrentUser('sub') userId: string,
    @Body() dto: ApplyFertilizerDto,
  ) {
    return this.fertilizerService.applyFertilizer(userId, dto.landId, dto.fertilizerType);
  }

  @Post('compost')
  @ApiOperation({ 
    summary: 'Compost fruits to create fertilizer',
    description: 'Burn fruits to convert them into fertilizer. Rates: 3 fruits = 1 Common, 10 = 1 Rare, 30 = 1 Epic, 100 = 1 Legendary'
  })
  @ApiResponse({
    status: 200,
    description: 'Fruits composted successfully',
    schema: {
      example: {
        success: true,
        fruitsConsumed: 30,
        fertilizersCreated: [
          { type: 'FERTILIZER_EPIC', amount: 1 },
        ],
        message: '🔥 Composted 30 fruits! Created: 1x FERTILIZER_EPIC',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient fruits',
  })
  compostFruits(
    @CurrentUser('sub') userId: string,
    @Body() dto: CompostDto,
  ) {
    return this.fertilizerService.compostFruits(userId, dto.fruitAmount);
  }
}

