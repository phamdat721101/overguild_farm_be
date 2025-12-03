import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ClaimLevelDto {
  @ApiProperty({
    example: 3,
    description: 'Level to claim rewards for',
  })
  @IsInt()
  @Min(1)
  level: number;
}


