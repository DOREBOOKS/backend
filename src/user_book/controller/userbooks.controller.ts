import { Controller, Get, Param } from '@nestjs/common';
import { UserBooksService } from '../service/userbooks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('userbooks')
@Controller('userbooks')
export class UserBooksController {
  constructor(private readonly userbooksService: UserBooksService) {}

  //유저별 도서 조회 조회 GET
  @Get('users/:userId')
  @ApiOperation({ summary: '유저별 도서 조회' })
  @ApiResponse({ status: 200, description: '모든 유저별 도서 반환' })
  findByUserId(@Param('userId') userId: string) {
    return this.userbooksService.findByUserId(userId);
  }
}
