import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, Min } from "class-validator";

export class MoveToStorageDto {
  @ApiProperty({
    example: "SEED_COMMON",
    description: "Item type to move back to storage",
  })
  @IsString()
  itemType: string;

  @ApiProperty({
    example: 5,
    description: "Amount to move",
  })
  @IsInt()
  @Min(1)
  amount: number;
}
