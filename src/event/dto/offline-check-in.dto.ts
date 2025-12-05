// src/event/dto/offline-check-in.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class OfflineCheckInDto {
  @ApiProperty({
    description: 'Check-in code provided by event organizer',
    example: 'BANGKOK2025',
    minLength: 4,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  code: string;
}