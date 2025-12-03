import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ApplyFertilizerDto {
  @ApiProperty({
    example: 'land-uuid',
    description: 'Land ID where the plant is located'
  })
  @IsString()
  @IsNotEmpty()
  landId: string;

  @ApiProperty({
    example: 'FERTILIZER_COMMON',
    enum: ['FERTILIZER_COMMON', 'FERTILIZER_RARE', 'FERTILIZER_EPIC', 'FERTILIZER_LEGENDARY'],
    description: 'Fertilizer type to apply'
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['FERTILIZER_COMMON', 'FERTILIZER_RARE', 'FERTILIZER_EPIC', 'FERTILIZER_LEGENDARY'])
  fertilizerType: string;
}

