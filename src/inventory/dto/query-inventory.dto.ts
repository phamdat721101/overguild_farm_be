import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum } from "class-validator";

export enum ItemCategory {
  ALL = "ALL",
  SEEDS = "SEEDS",
  FRUITS = "FRUITS",
  FERTILIZERS = "FERTILIZERS",
  EVENT_REWARDS = "EVENT_REWARDS",
  CONSUMABLES = "CONSUMABLES",
}

export class QueryInventoryDto {
  @ApiPropertyOptional({
    description: "Filter by item category",
    enum: ItemCategory,
    example: ItemCategory.SEEDS,
  })
  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @ApiPropertyOptional({
    description: "Search by item type (partial match)",
    example: "SEED",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
