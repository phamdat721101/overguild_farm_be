import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEthereumAddress, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
    description: 'Wallet address'
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({ 
    example: '0xa5fd281641b55bda34...',
    description: 'Signature from wallet.signMessage()'
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ 
    example: '0x5a813c4167584f8fd8db837fcb103cf975ec2d9c66a776d436d9d7bbcfaf8845',
    description: 'Nonce from /auth/challenge'
  })
  @IsString()
  @IsNotEmpty()
  nonce: string;

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
