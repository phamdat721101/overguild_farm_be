import { IsNotEmpty, IsString, IsInt, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddTradeItemDto {
  @ApiProperty({ description: "Item type to add" })
  @IsString()
  @IsNotEmpty()
  itemType: string;

  @ApiProperty({ description: "Amount to add", minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;
}
