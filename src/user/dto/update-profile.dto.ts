import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUrl,
  IsIn,
} from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: "NewPlayerName",
    description: "Username (3-20 characters)",
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(20)
  username?: string;

  @ApiPropertyOptional({
    example: "https://avatar.iran.liara.run/public/42",
    description: "Avatar image URL",
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    example: "sui",
    description: "Blockchain network",
    enum: ["sui", "ethereum", "polygon", "base"],
  })
  @IsString()
  @IsOptional()
  @IsIn(["sui", "ethereum", "polygon", "base"])
  network?: string;

  @ApiPropertyOptional({
    example: "Passionate Web3 builder and GameFi enthusiast",
    description: "User bio (max 200 characters)",
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({
    example: "https://twitter.com/username",
    description: "Twitter/X profile URL",
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional({
    example: "https://github.com/username",
    description: "GitHub profile URL",
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  github?: string;

  @ApiPropertyOptional({
    example: "https://discord.gg/username",
    description: "Discord profile URL or username",
  })
  @IsString()
  @IsOptional()
  discord?: string;
}
