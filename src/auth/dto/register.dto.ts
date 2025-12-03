import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEthereumAddress,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
    description: "Wallet address",
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiPropertyOptional({
    example: "Alice",
    description: "Username (optional, 3-20 characters)",
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters" })
  @MaxLength(20, { message: "Username must not exceed 20 characters" })
  username?: string;
}
