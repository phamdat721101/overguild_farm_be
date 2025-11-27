import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ 
    example: 'NewPlayerName',
    description: 'Username (3-20 characters)',
    minLength: 3,
    maxLength: 20
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(20)
  username?: string;

  @ApiPropertyOptional({ 
    example: 'https://avatar.iran.liara.run/public/42',
    description: 'Avatar image URL'
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  avatar?: string;
}
