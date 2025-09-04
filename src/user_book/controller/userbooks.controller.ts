import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserBooksService } from '../service/userbooks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('userbooks')
@Controller('userbooks')
export class UserBooksController {
  constructor(private readonly userbooksService: UserBooksService) {}

  //유저별 도서 조회 조회 GET
  @Get('users')
  @ApiOperation({ summary: '유저별 도서 조회' })
  @ApiResponse({ status: 200, description: '모든 유저별 도서 반환' })
  findByUserId(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.userbooksService.findByUserId(userId);
  }
}
