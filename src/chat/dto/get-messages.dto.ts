import { IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class GetMessagesDto {
  @ApiPropertyOptional({
    description: "Number of messages to fetch",
    default: 50,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: "Cursor for pagination (message ID)" })
  @IsString()
  @IsOptional()
  before?: string;
}
