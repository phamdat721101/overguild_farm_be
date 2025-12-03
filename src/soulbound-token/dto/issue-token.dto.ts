import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class IssueTokenDto {
  @ApiProperty({
    example: 'Token2049 Veteran',
    description: 'Name of the soulbound token (badge/achievement name)'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: {
      description: 'Attended Token2049 event',
      eventId: 'event-uuid',
      rarity: 'RARE',
      icon: 'https://example.com/badge-icon.png'
    },
    description: 'Additional metadata for the token'
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

