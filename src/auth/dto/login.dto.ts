import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEthereumAddress, IsIn, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
    description: 'Wallet address'
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiPropertyOptional({ 
    example: 'SuiPlayer',
    description: 'Username (3-20 characters)'
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ 
    example: 'sui',
    enum: ['sui', 'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'],
    description: 'Blockchain network',
    default: 'sui'
  })
  @IsString()
  @IsOptional()
  @IsIn(['sui', 'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'])
  network?: string;

  @ApiPropertyOptional({ 
    example: 'https://avatar.iran.liara.run/public',
    description: 'Avatar image URL'
  })
  @IsString()
  @IsOptional()
  avatar?: string;
}
