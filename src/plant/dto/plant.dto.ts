import { IsString, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PlantSeedDto {
  @ApiProperty({ example: "land-uuid-123" })
  @IsString()
  @IsNotEmpty()
  landId: string;

  @ApiProperty({
    example: "SOCIAL",
    enum: ["SOCIAL", "TECH", "CREATIVE", "BUSINESS"],
  })
  @IsEnum(["SOCIAL", "TECH", "CREATIVE", "BUSINESS"])
  seedType: string;
}

export class InteractPlantDto {
  @ApiProperty({ example: "visit", enum: ["visit", "social"] })
  @IsEnum(["visit", "social"])
  action: "visit" | "social";
}
