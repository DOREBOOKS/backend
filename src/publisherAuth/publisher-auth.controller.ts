import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { PublisherAuthService } from './publisher-auth.service';
import { PublisherLoginDto } from './publisher-login.dto';

@ApiTags('publisher-auth')
@Controller('publisher-auth')
@Public()
export class PublisherAuthController {
  constructor(private readonly publisherAuthService: PublisherAuthService) {}

  @Post('login')
  @ApiOperation({ summary: '출판사 로그인' })
  @ApiResponse({ status: 200, description: 'JWT 토큰 및 출판사 정보 반환' })
  async login(@Body() dto: PublisherLoginDto) {
    console.log('[controller body]', dto);
    return this.publisherAuthService.login(dto);
  }
}
