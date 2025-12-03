import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, Min, IsOptional } from "class-validator";

export class AddItemDto {
  @ApiProperty({
    description: "Item type (e.g., SEED_COMMON, FRUIT, FERTILIZER_RARE)",
    example: "SEED_COMMON",
  })
  @IsString()
  itemType: string;

  @ApiProperty({
    description: "Amount to add",
    example: 5,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;
}

export class RemoveItemDto {
  @ApiProperty({
    description: "Item type to remove",
    example: "SEED_COMMON",
  })
  @IsString()
  itemType: string;

  @ApiProperty({
    description: "Amount to remove",
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;
}

export class TransferItemDto {
  @ApiProperty({
    description: "Recipient user ID or wallet address",
    example: "uuid-or-wallet-address",
  })
  @IsString()
  recipientId: string;

  @ApiProperty({
    description: "Item type to transfer",
    example: "FRUIT",
  })
  @IsString()
  itemType: string;

  @ApiProperty({
    description: "Amount to transfer",
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: "Optional message for the transfer",
    example: "Gift for helping me water my plants!",
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}
