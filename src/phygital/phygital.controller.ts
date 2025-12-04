import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PhygitalService } from "./phygital.service";
import { RedeemRewardDto } from "./dto/redeem-reward.dto";

@ApiTags("Phygital Exchange")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("phygital")
export class PhygitalController {
  constructor(private readonly phygitalService: PhygitalService) {}

  @Get("rewards")
  @ApiOperation({ summary: "List phygital rewards and exchange rates" })
  @ApiResponse({
    status: 200,
    description: "Reward catalog with current player balances",
  })
  getRewards(@CurrentUser() user: any) {
    return this.phygitalService.getRewardCatalog(user.sub);
  }

  @Post("redeem")
  @ApiOperation({ summary: "Redeem a phygital reward using in-game resources" })
  @ApiResponse({ status: 201, description: "Reward redeemed successfully" })
  redeem(@CurrentUser() user: any, @Body() dto: RedeemRewardDto) {
    return this.phygitalService.redeemReward(user.sub, dto);
  }

  @Get("redemptions")
  @ApiOperation({ summary: "Get current user's phygital redemption history" })
  getHistory(@CurrentUser() user: any) {
    return this.phygitalService.getRedemptionHistory(user.sub);
  }
}
