// src/auth/auth.controller.ts
import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignupDto } from './auth.dto'; // Assuming you have a DTO for login
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private authService: AuthService) {}
  @Get('hello')
  hello() {
    console.log('hello called');
    return 'Hello World!';
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공, JWT 토큰 반환.' })
  @ApiResponse({ status: 401, description: '인증 실패.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  @ApiResponse({ status: 404, description: '사용자 없음.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공, JWT 토큰 반환.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일.' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
  @Post('oauth/:provider')
  @ApiOperation({ summary: 'oauth' })
  @ApiResponse({ status: 201, description: '성공, JWT 토큰 반환.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  @ApiResponse({ status: 401, description: '인증 실패.' })
  oauth(
    @Param('provider') provider: 'google' | 'kakao',
    @Body() body: { idToken?: string; accessToken?: string },
  ) {
    return this.authService.oauthExchange(provider, body);
  }
}
