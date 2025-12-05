import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateEventDto {
  @ApiProperty({
    description: "Event name",
    example: "OverGuild Builder Meetup #1",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Event description",
    example: "Meet other OverGuild builders and share your projects.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Event start time (ISO8601)",
    example: "2025-12-10T18:00:00.000Z",
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: "Event end time (ISO8601)",
    example: "2025-12-10T21:00:00.000Z",
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: "Event location (free text)",
    example: "HCMC, Vietnam",
  })
  @IsString()
  location: string;

   @ApiProperty({
    description: 'Creator wallet',
    example: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
  })
  @IsString()
  creatorWallet: string;
}
