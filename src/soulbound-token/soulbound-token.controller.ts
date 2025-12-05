import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SoulboundTokenService } from "./soulbound-token.service";
import { IssueTokenDto } from "./dto/issue-token.dto";

@ApiTags("Soulbound Tokens")
@ApiBearerAuth("JWT-auth")
@Controller("soulbound-tokens")
@UseGuards(JwtAuthGuard)
export class SoulboundTokenController {
  constructor(private readonly soulboundTokenService: SoulboundTokenService) {}

  @Get()
  @ApiOperation({
    summary: "Get user soulbound tokens (badges/achievements)",
    description: "Returns all badges and achievements earned by the user",
  })
  @ApiResponse({
    status: 200,
    description: "List of soulbound tokens",
    schema: {
      example: {
        tokens: [
          {
            id: "uuid",
            userId: "user-uuid",
            name: "First Sprout",
            issuedAt: "2025-11-29T...",
            metadata: {
              rarity: "COMMON",
              category: "gardening",
              description: "Planted your first seed",
            },
          },
        ],
        total: 1,
        byCategory: {
          gardening: [],
          events: [],
        },
      },
    },
  })
  getUserTokens(@CurrentUser("sub") userId: string) {
    return this.soulboundTokenService.getUserTokens(userId);
  }

  @Post("issue")
  @ApiOperation({
    summary: "Issue a custom soulbound token",
    description:
      "Manually issue a badge/achievement to a user (admin or system use)",
  })
  @ApiResponse({
    status: 201,
    description: "Token issued successfully",
  })
  @ApiResponse({
    status: 400,
    description: "User already has this badge",
  })
  issueToken(@CurrentUser("sub") userId: string, @Body() dto: IssueTokenDto) {
    return this.soulboundTokenService.issueToken(
      userId,
      dto.name,
      dto.metadata,
    );
  }

  @Post("check-badges")
  @ApiOperation({
    summary: "Check and auto-issue badges",
    description:
      "Automatically check user achievements and issue eligible badges",
  })
  @ApiResponse({
    status: 200,
    description: "Badge check completed",
    schema: {
      example: {
        issued: ["FIRST_PLANT", "HARVEST_MASTER"],
        message: "🎖️ 2 new badge(s) earned!",
      },
    },
  })
  checkBadges(@CurrentUser("sub") userId: string) {
    return this.soulboundTokenService.checkAndIssueBadges(userId);
  }

  @Get("badge-configs")
  @ApiOperation({
    summary: "Get all available badge configurations",
    description: "Returns list of all predefined badges and their requirements",
  })
  @ApiResponse({
    status: 200,
    description: "List of badge configurations",
  })
  getBadgeConfigs() {
    return this.soulboundTokenService.getBadgeConfigs();
  }
}
