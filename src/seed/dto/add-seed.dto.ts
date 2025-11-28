import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSeedDto {
  @ApiProperty({ enum: ['SOCIAL', 'TECH', 'CREATIVE', 'BUSINESS'], example: 'SOCIAL' })
  @IsString()
  @IsIn(['SOCIAL', 'TECH', 'CREATIVE', 'BUSINESS'])
  type: string;

  @ApiProperty({ enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'], example: 'COMMON', required: false })
  @IsString()
  @IsIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY'])
  @IsOptional()
  rarity?: string;
}