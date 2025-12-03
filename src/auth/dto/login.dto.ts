import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
    description: 'Wallet address'
  })
  @IsEthereumAddress()
  walletAddress: string;
}

