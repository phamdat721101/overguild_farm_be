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
    summary: 'Get user\'s garden (all plants with growth info)',
    description: 'Returns all lands with plants, growth progress, health status, and time to wilt'
  })
  @ApiResponse({
    status: 200,
    description: 'Garden data with all plants',
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
    summary: 'Water a plant (social feature)',
    description: 'Water any plant to help it grow. Rate limit: 1 water per hour per plant'
  })
  @ApiResponse({
    status: 200,
    description: 'Plant watered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Plant was recently watered or is dead/ready to harvest',
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