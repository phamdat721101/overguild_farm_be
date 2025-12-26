import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendFriendRequestDto {
  @ApiProperty({ description: "User ID to send friend request to" })
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
