import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlantService } from './plant.service';
import { PlantSeedDto, InteractPlantDto } from './dto/plant.dto';

@ApiTags('garden')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class PlantController {
  constructor(private readonly plantService: PlantService) {}

  @Get('garden')
  @ApiOperation({ 
    summary: 'Get user\'s garden (all plants with water info)',
    description: 'Returns all lands with plants, growth progress, water count, and watering status'
  })
  @ApiResponse({
    status: 200,
    description: 'Garden data with water tracking',
    schema: {
      example: [{
        landId: 'land-uuid',
        plotIndex: 0,
        plant: {
          id: 'plant-uuid',
          type: 'ALGAE',
          name: 'Tảo (Algae)',
          stage: 'GROWING',
          plantedAt: '2025-12-03T10:00:00.000Z',
          waterCount: 5,
          interactions: 5,
          lastWateredAt: '2025-12-03T12:00:00.000Z',
        },
        progress: {
          percentage: 50,
          timeRemaining: '6h',
          currentPhase: 'GROWING',
          canWater: true,
          isHarvestable: false,
        },
        water: {
          totalWaters: 5,
          uniqueWaterers: 3,
          waterBonus: 2,
          expectedYield: 5,
          canWaterToday: true,
          nextWaterTime: 'Now',
        },
        config: {
          totalTime: '12h',
          baseYield: 3,
          bonusPerWater: 0.5,
        },
        message: '⏳ 6h until ready',
      }],
    },
  })
  getGarden(@CurrentUser('sub') userId: string) {
    return this.plantService.getGarden(userId);
  }

  @Post('plant/plant')
  @ApiOperation({ 
    summary: 'Plant a seed on a land plot',
    description: 'Consumes a seed from inventory and creates a plant on the specified land'
  })
  @ApiResponse({
    status: 200,
    description: 'Plant created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Land already has a plant or insufficient seeds',
  })
  plant(@CurrentUser('sub') userId: string, @Body() dto: PlantSeedDto) {
    return this.plantService.plantSeed(userId, dto.landId, dto.seedType);
  }

  @Patch('plant/:id/water')
  @ApiOperation({ 
    summary: 'Water a plant (once per day per user)',
    description: 'Water any plant to help it grow. Each water adds +0.5 bonus fruit. Limit: 1 water per user per plant per day'
  })
  @ApiResponse({
    status: 200,
    description: 'Plant watered successfully',
    schema: {
      example: {
        plant: {
          id: 'plant-uuid',
          waterCount: 6,
          lastWateredAt: '2025-12-03T13:00:00.000Z',
        },
        message: '💧 Plant watered successfully! +0.5 bonus fruit at harvest',
        waterCount: 6,
        totalWaterers: 4,
        canWaterAgainIn: '24h',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Already watered today or plant not waterable',
  })
  water(@Param('id') plantId: string, @CurrentUser('sub') userId: string) {
    return this.plantService.waterPlant(plantId, userId);
  }

  @Post('plant/:id/harvest')
  @ApiOperation({ 
    summary: 'Harvest fruits from a mature plant',
    description: 'Harvest fruits when plant reaches FRUIT stage. Clears the land for new planting.'
  })
  @ApiResponse({
    status: 200,
    description: 'Plant harvested successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Plant is not ready to harvest or not owned by user',
  })
  harvest(@Param('id') plantId: string, @CurrentUser('sub') userId: string) {
    return this.plantService.harvestPlant(plantId, userId);
  }

  @Patch('plant/:id/interact')
  @ApiOperation({ summary: 'Interact with plant (visit/social) - Legacy endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Plant interaction successful',
  })
  interact(
    @Param('id') plantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InteractPlantDto,
  ) {
    return this.plantService.interactPlant(plantId, userId, dto.action);
  }
}