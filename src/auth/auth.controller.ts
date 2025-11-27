import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('challenge')
  @ApiOperation({ 
    summary: 'Get nonce for wallet signature',
    description: 'Step 1: Client requests a nonce to sign with Metamask/Sui wallet'
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    required: true,
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Wallet address (Ethereum/Sui format)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns nonce and message to sign',
    schema: {
      example: {
        nonce: '0x5a813c4167584f8fd8db837fcb103cf975ec2d9c66a776d436d9d7bbcfaf8845',
        message: 'Sign this message to login to OverGuild:\n\nNonce: 0x5a81...\nTimestamp: 2025-11-26T...'
      }
    }
  })
  getChallenge(@Query('walletAddress') walletAddress: string) {
    return this.authService.getChallenge(walletAddress);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login with signed message',
    description: 'Step 2: Verify signature and return JWT token. Auto-creates user + first plant on signup.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns JWT token and user info',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        user: {
          id: '69aea000-8ba2-494c-bc0f-d3ed6b3741b3',
          walletAddress: '0xd5ff68d3176e0bf698563e694ba5e7133584754c',
          network: 'sui',
          username: 'SuiPlayer',
          avatar: 'https://avatar.example.com/1.png',
          xp: 0,
          reputationScore: 0,
          plantsCount: 1
        },
        isNewUser: true
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid signature or expired nonce' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
