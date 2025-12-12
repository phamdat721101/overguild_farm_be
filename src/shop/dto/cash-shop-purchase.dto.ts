import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, IsOptional } from "class-validator";
import { CashShopItemKey } from "../shop.constants";

export class CashShopPurchaseDto {
  @ApiProperty({
    enum: CashShopItemKey,
    example: CashShopItemKey.GEM_PACK_SMALL,
    description: "The cash shop item to purchase",
  })
  @IsEnum(CashShopItemKey)
  itemKey: CashShopItemKey;

  @ApiProperty({
    example: "stripe_payment_intent_id",
    description: "Payment provider transaction ID",
  })
  @IsString()
  paymentId: string;

  @ApiProperty({
    example: "stripe",
    description: "Payment provider (stripe, paypal, etc.)",
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentProvider?: string = "stripe";
}
