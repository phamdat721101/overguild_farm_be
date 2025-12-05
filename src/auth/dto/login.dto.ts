import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
    description:
      "Wallet address\n\n" +
      "Supported formats:\n" +
      "- Ethereum: 0x + 40 hex characters\n" +
      "- Sui: 0x + 64 hex characters",
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
}
