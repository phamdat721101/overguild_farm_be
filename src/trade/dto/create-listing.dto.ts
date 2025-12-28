import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsOptional,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateListingDto {
  @ApiProperty({ description: "Item type to sell" })
  @IsString()
  @IsNotEmpty()
  itemType: string;

  @ApiProperty({ description: "Amount to sell", minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: "Price in Gold" })
  @IsInt()
  @Min(1)
  @IsOptional()
  priceGold?: number;

  @ApiPropertyOptional({ description: "Price in Gem" })
  @IsInt()
  @Min(1)
  @IsOptional()
  priceGem?: number;
}
