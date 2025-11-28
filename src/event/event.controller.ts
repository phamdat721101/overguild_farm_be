import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckInDto } from './dto/check-in.dto';
import { EventService } from './event.service';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in to a nearby event and receive seeds' })
  @ApiResponse({ status: 200, description: 'Successfully checked in' })
  @ApiResponse({ status: 404, description: 'No nearby events found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkIn(
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.eventService.checkIn(userId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active events' })
  @ApiResponse({ status: 200, description: 'Returns list of active events' })
  async getActiveEvents() {
    return this.eventService.getActiveEvents();
  }
}

