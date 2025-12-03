import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEthereumAddress, IsString, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
    description: 'Wallet address'
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    example: '0xa5fd281641b55bda3484f8c5c7d0e6b5c8e9f3d2a1b0c9d8e7f6a5b4c3d2e1f0a5fd281641b55bda3484f8c5c7d0e6b5c8e9f3d2a1b0c9d8e7f6a5b4c3d2e1f001',
    description: 'Signature from wallet signing the challenge message'
  })
  @IsString()
  signature: string;

  @ApiProperty({
    example: '0x5a813c4167584f8fd8db837fcb103cf975ec2d9c66a776d436d9d7bbcfaf8845',
    description: 'Nonce received from /auth/challenge endpoint'
  })
  @IsString()
  nonce: string;

  @ApiPropertyOptional({
    example: 'PlayerOne',
    description: 'Optional username (can be set/updated later)'
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    example: 'sui',
    description: 'Blockchain network',
    enum: ['sui', 'ethereum', 'polygon', 'base']
  })
  @IsString()
  @IsOptional()
  @IsIn(['sui', 'ethereum', 'polygon', 'base', 'multi-chain'])
  network?: string;

  @ApiPropertyOptional({
    example: 'https://avatar.iran.liara.run/public/1',
    description: 'Avatar image URL'
  })
  @IsString()
  @IsOptional()
  avatar?: string;
}
