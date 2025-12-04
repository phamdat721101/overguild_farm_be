import { Body, Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register new user",
    description:
      "Register a new user with wallet address.\n\n" +
      "**Features:**\n" +
      "- Automatically creates 1 starter land with 1 plant\n" +
      "- Username is optional (3-20 characters)\n" +
      "- Returns JWT token for authentication\n\n" +
      "**Validations:**\n" +
      "- Wallet address must be unique\n" +
      "- Username must be unique (if provided)\n" +
      "- Username: 3-20 characters (optional)",
  })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    schema: {
      example: {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "8b821d52-ac23-4427-a207-630dfc26641e",
          walletAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
          network: "multi-chain",
          username: "Bob",
          avatar: null,
          xp: 0,
          reputationScore: 0,
          landsCount: 1,
          plantsCount: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Wallet address or username already exists",
    schema: {
      example: {
        message: "Username already taken",
        error: "Conflict",
        statusCode: 409,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation error",
    schema: {
      example: {
        message: ["Username must be at least 3 characters"],
        error: "Bad Request",
        statusCode: 400,
      },
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Login with wallet address",
    description:
      "Login with existing wallet address. User must be registered first.",
  })
  @ApiResponse({
    status: 200,
    description: "Returns JWT token and user info",
    schema: {
      example: {
        accessToken: "eyJhbGciOiJIUzI1NiIs...",
        user: {
          id: "69aea000-8ba2-494c-bc0f-d3ed6b3741b3",
          walletAddress: "0xd5ff68d3176e0bf698563e694ba5e7133584754c",
          network: "sui",
          username: "SuiPlayer",
          avatar: "https://avatar.example.com/1.png",
          xp: 0,
          reputationScore: 0,
          landsCount: 1,
          plantsCount: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
