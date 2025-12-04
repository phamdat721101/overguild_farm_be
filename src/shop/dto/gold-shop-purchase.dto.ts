import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { GoldShopItemKey } from "../shop.constants";

export class GoldShopPurchaseDto {
  @ApiProperty({
    enum: GoldShopItemKey,
    description: "Gold shop item key to purchase",
    example: GoldShopItemKey.SHOVEL,
  })
  @IsEnum(GoldShopItemKey)
  itemKey: GoldShopItemKey;
}


