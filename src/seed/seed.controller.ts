import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SeedService } from './seed.service';
import { AddSeedDto } from './dto/add-seed.dto';

@ApiTags('Seed')
@ApiBearerAuth('JWT-auth')
@Controller('seed')
@UseGuards(JwtAuthGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Get user seed inventory' })
  getInventory(@CurrentUser() user: any) {
    return this.seedService.getUserSeeds(user.sub);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add seed to inventory (admin/reward)' })
  addSeed(@CurrentUser() user: any, @Body() dto: AddSeedDto) {
    return this.seedService.addSeed(user.sub, dto.type, dto.rarity);
  }

  @Post('craft/mushroom')
  @ApiOperation({ summary: 'Craft MUSHROOM seed from 5 ALGAE fruits' })
  @ApiResponse({
    status: 200,
    description: 'MUSHROOM seed crafted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient ALGAE fruits',
  })
  craftMushroom(@CurrentUser('sub') userId: string) {
    return this.seedService.craftMushroom(userId);
  }
}