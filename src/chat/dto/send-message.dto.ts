import { IsNotEmpty, IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  FILE = "FILE",
}

export class SendMessageDto {
  @ApiProperty({ description: "Conversation ID" })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: "Message content" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;
}
