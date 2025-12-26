import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { FriendService } from "./friend.service";
import { SendFriendRequestDto, SearchUsersDto } from "./dto";

@ApiTags("Friend")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
@Controller("friend")
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get("search")
  @ApiOperation({ summary: "Search users by username" })
  @ApiQuery({ name: "query", required: false })
  async searchUsers(@CurrentUser() user: any, @Query() dto: SearchUsersDto) {
    return this.friendService.searchUsers(user.sub, dto.query);
  }

  @Post("request")
  @ApiOperation({ summary: "Send friend request" })
  async sendFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto
  ) {
    return this.friendService.sendFriendRequest(user.sub, dto.receiverId);
  }

  @Get("requests/received")
  @ApiOperation({ summary: "Get received friend requests" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
  })
  async getReceivedRequests(
    @CurrentUser() user: any,
    @Query("status") status?: string
  ) {
    return this.friendService.getReceivedRequests(user.sub, status);
  }

  @Get("requests/sent")
  @ApiOperation({ summary: "Get sent friend requests" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "ACCEPTED", "REJECTED"],
  })
  async getSentRequests(
    @CurrentUser() user: any,
    @Query("status") status?: string
  ) {
    return this.friendService.getSentRequests(user.sub, status);
  }

  @Post("request/:requestId/accept")
  @ApiOperation({ summary: "Accept friend request" })
  async acceptFriendRequest(
    @CurrentUser() user: any,
    @Param("requestId") requestId: string
  ) {
    return this.friendService.acceptFriendRequest(user.sub, requestId);
  }

  @Post("request/:requestId/reject")
  @ApiOperation({ summary: "Reject friend request" })
  async rejectFriendRequest(
    @CurrentUser() user: any,
    @Param("requestId") requestId: string
  ) {
    return this.friendService.rejectFriendRequest(user.sub, requestId);
  }

  @Delete("request/:requestId")
  @ApiOperation({ summary: "Cancel sent friend request" })
  async cancelFriendRequest(
    @CurrentUser() user: any,
    @Param("requestId") requestId: string
  ) {
    return this.friendService.cancelFriendRequest(user.sub, requestId);
  }

  @Get("list")
  @ApiOperation({ summary: "Get friends list" })
  async getFriends(@CurrentUser() user: any) {
    return this.friendService.getFriends(user.sub);
  }

  @Delete(":friendId")
  @ApiOperation({ summary: "Remove friend" })
  async removeFriend(
    @CurrentUser() user: any,
    @Param("friendId") friendId: string
  ) {
    return this.friendService.removeFriend(user.sub, friendId);
  }

  @Get("count")
  @ApiOperation({ summary: "Get friend count" })
  async getFriendCount(@CurrentUser() user: any) {
    const count = await this.friendService.getFriendCount(user.sub);
    return { count };
  }
}
