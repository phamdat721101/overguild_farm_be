import { IsNotEmpty, IsString } from "class-validator";

export class AssignSeedDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  seedType: string;
}
