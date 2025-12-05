import { Controller, Post, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { StreakService } from "./streak.service";
import {
  CheckinResponseDto,
  StreakStatusDto,
  CheckinHistoryDto,
} from "./dto/streak-response.dto";
import { PaginationDto } from "./dto/pagination.dto";

@ApiTags("Streak")
@Controller("streak")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Post("checkin")
  @ApiOperation({ summary: "Perform daily check-in" })
  async checkin(
    @CurrentUser("sub") userId: string
  ): Promise<CheckinResponseDto> {
    return this.streakService.performCheckin(userId);
  }

  @Get("status")
  @ApiOperation({ summary: "Get current streak status" })
  async getStatus(
    @CurrentUser("sub") userId: string
  ): Promise<StreakStatusDto> {
    return this.streakService.getStreakStatus(userId);
  }

  @Get("history")
  @ApiOperation({ summary: "Get check-in history" })
  async getHistory(
    @CurrentUser("sub") userId: string,
    @Query() pagination: PaginationDto
  ): Promise<CheckinHistoryDto> {
    return this.streakService.getCheckinHistory(
      userId,
      pagination.page,
      pagination.limit
    );
  }
}
