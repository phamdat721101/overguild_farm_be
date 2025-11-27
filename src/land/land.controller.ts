import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LandService } from './land.service';
import { AssignSeedDto } from './dto/assign-seed.dto';

@Controller('land')
export class LandController {
  constructor(private readonly landService: LandService) {}

  @Get(':wallet')
  getLand(@Param('wallet') wallet: string) {
    return this.landService.getLand(wallet);
  }

  @Post('assign-seed')
  assignSeed(@Body() dto: AssignSeedDto) {
    return this.landService.assignSeed(dto);
  }
}
