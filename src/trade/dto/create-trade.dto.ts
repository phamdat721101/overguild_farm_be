import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTradeDto {
  @ApiProperty({ description: "User ID to trade with" })
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
