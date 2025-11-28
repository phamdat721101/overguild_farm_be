import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ 
    summary: 'Login with wallet address',
    description: 'Simple wallet-based login that auto-creates a user + starter land/plant if this is the first time.'
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
