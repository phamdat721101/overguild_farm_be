import { IsNotEmpty, IsString, IsInt, Min, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum CurrencyType {
  GOLD = "GOLD",
  GEM = "GEM",
}

export class AddTradeCurrencyDto {
  @ApiProperty({ enum: CurrencyType, description: "Currency type" })
  @IsEnum(CurrencyType)
  @IsNotEmpty()
  currencyType: CurrencyType;

  @ApiProperty({ description: "Amount to add", minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;
}
