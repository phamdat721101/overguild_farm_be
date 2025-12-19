import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, Min } from "class-validator";

export enum CurrencyType {
  GOLD = "GOLD",
  GEM = "GEM",
}

export class AddCurrencyDto {
  @ApiProperty({
    enum: CurrencyType,
    example: CurrencyType.GOLD,
    description: "Type of currency to add",
  })
  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @ApiProperty({
    example: 100,
    description: "Amount to add (positive) or subtract (negative)",
  })
  @IsInt()
  amount: number;
}

