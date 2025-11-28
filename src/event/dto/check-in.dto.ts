import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ description: 'Event ID from FundX', example: 'c91fef29-f5a4-4e74-b6ee-48bab97d95be' })
  @IsUUID()
  eventId: string;

  @ApiPropertyOptional({ description: 'Optional verification code', example: 'SECRET123' })
  @IsOptional()
  @IsString()
  verificationCode?: string;
}

