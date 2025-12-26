import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SearchUsersDto {
  @ApiPropertyOptional({ description: "Search query for username" })
  @IsString()
  @IsOptional()
  @MinLength(2)
  query?: string;
}
