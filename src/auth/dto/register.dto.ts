import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: "0xcccccccccccccccccccccccccccccccccccccccc",
    description:
      "Wallet address (must be unique)\n\n" +
      "Supported formats:\n" +
      "- Ethereum: 0x + 40 hex characters (42 total)\n" +
      "- Sui: 0x + 64 hex characters (66 total)",
    examples: {
      ethereum: {
        value: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
        summary: "Ethereum address",
      },
      sui: {
        value:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        summary: "Sui address",
      },
    },
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$|^0x[a-fA-F0-9]{64}$/, {
    message:
      "Invalid wallet address. Must be Ethereum (0x + 40 hex) or Sui (0x + 64 hex) format",
  })
  walletAddress: string;

  @ApiPropertyOptional({
    example: "Bob",
    description:
      "Username (optional, must be unique if provided, 3-20 characters)",
    minLength: 3,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters" })
  @MaxLength(20, { message: "Username must not exceed 20 characters" })
  username?: string;
}
