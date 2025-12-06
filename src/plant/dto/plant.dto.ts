import { IsString, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PlantSeedDto {
  @ApiProperty({ 
    example: "land-uuid-123",
    description: "Land ID where to plant the seed"
  })
  @IsString()
  @IsNotEmpty()
  landId: string;

  @ApiProperty({
    example: "ALGAE",
    enum: ["ALGAE", "MUSHROOM", "TREE"],
    description: "Seed type to plant. ALGAE (13h), MUSHROOM (82h), TREE (792h)"
  })
  @IsEnum(["ALGAE", "MUSHROOM", "TREE"])
  @IsNotEmpty()
  seedType: string;
}

export class InteractPlantDto {
  @ApiProperty({ example: "visit", enum: ["visit", "social"] })
  @IsEnum(["visit", "social"])
  action: "visit" | "social";
}
