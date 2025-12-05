import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserService } from "./user.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags("User")
@ApiBearerAuth("JWT-auth")
@Controller("user")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Returns user profile with lands, inventory items, and counts",
    schema: {
      example: {
        id: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
        walletAddress: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
        network: "multi-chain",
        username: "SuiPlayer",
        avatar: "https://avatar.iran.liara.run/public",
        bio: null,
        twitter: null,
        github: null,
        discord: null,
        xp: 150,
        reputationScore: 20,
        balanceRuby: 100,
        balanceGold: 50,
        createdAt: "2025-11-26T15:48:58.844Z",
        updatedAt: "2025-11-26T15:48:58.844Z",
        lands: [],
        inventoryItems: [
          {
            id: "0d5da75d-b968-49a6-8b93-176d4db36c1e",
            userId: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
            itemType: "SEED_COMMON",
            amount: 7,
            createdAt: "2025-12-02T18:31:58.525Z",
            updatedAt: "2025-12-02T18:35:10.395Z",
          },
        ],
        _count: {
          lands: 0,
          inventoryItems: 3,
          missionLogs: 0,
          soulboundTokens: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT",
  })
  getProfile(@CurrentUser() user: any) {
    return this.userService.getProfile(user.sub);
  }

  @Patch("profile")
  @ApiOperation({
    summary: "Update user profile",
    description:
      "Update username, avatar, bio, social links, and network preference",
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    schema: {
      example: {
        id: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
        walletAddress: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
        network: "sui",
        username: "UpdatedName",
        avatar: "https://avatar.iran.liara.run/public/42",
        bio: "Passionate Web3 builder",
        twitter: "https://twitter.com/username",
        github: "https://github.com/username",
        discord: "username#1234",
        xp: 150,
        reputationScore: 20,
        balanceRuby: 100,
        balanceGold: 50,
        createdAt: "2025-11-26T15:48:58.844Z",
        updatedAt: "2025-11-27T19:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid input data (validation failed)",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT",
  })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Get("qr")
  @ApiOperation({
    summary: "Get QR code data for social features",
    description:
      "Returns user ID and deep link for QR code generation (for water social feature)",
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        userId: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
        walletAddress: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
        qrData: "overguild://user/69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
      },
    },
  })
  getQR(@CurrentUser() user: any) {
    return {
      userId: user.sub,
      walletAddress: user.walletAddress,
      qrData: `overguild://user/${user.sub}`,
    };
  }
}
