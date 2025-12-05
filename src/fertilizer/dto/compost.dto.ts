import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, IsNotEmpty } from "class-validator";

export class CompostDto {
  @ApiProperty({
    example: 5,
    description: "Number of fruits to compost (burn)",
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  fruitAmount: number;
}
