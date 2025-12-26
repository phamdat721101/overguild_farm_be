import { IsNotEmpty, IsString, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateConversationDto {
  @ApiProperty({ description: "Participant user ID for direct chat" })
  @IsString()
  @IsNotEmpty()
  participantId: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({ description: "Group name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Participant user IDs", type: [String] })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}
