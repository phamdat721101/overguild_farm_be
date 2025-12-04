import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PhygitalResourceType, PhygitalRewardKey } from "../phygital.constants";

export class RedeemRewardDto {
  @ApiProperty({ enum: PhygitalRewardKey, description: "Reward you want to redeem" })
  @IsEnum(PhygitalRewardKey)
  rewardKey: PhygitalRewardKey;

  @ApiProperty({
    enum: PhygitalResourceType,
    description: "Resource type used to pay for the reward (TREE / MUSHROOM / SPORE)",
  })
  @IsEnum(PhygitalResourceType)
  paymentType: PhygitalResourceType;

  @ApiProperty({
    required: false,
    description: "Contact info (Telegram, email, Discord, etc.)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  contact?: string;

  @ApiProperty({
    required: false,
    description: "Shipping address (if the reward needs to be shipped)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  shippingAddress?: string;

  @ApiProperty({ required: false, description: "Extra note for the core team" })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
