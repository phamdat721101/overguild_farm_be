import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, Min } from "class-validator";
import { GemShopItemKey } from "../shop.constants";

export class GemShopPurchaseDto {
  @ApiProperty({
    enum: GemShopItemKey,
    example: GemShopItemKey.ALGAE_SEED,
    description: "The gem shop item to purchase",
  })
  @IsEnum(GemShopItemKey)
  itemKey: GemShopItemKey;

  @ApiProperty({
    example: 1,
    description: "Quantity to purchase",
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}
