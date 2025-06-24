import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  ValidationPipe,
  Delete,
  Query,
} from '@nestjs/common';
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

  //유저별 거래내역 조회 GET
  @Get('deals/users/:userId')
  @ApiOperation({ summary: '유저별 거래내역 조회' })
  @ApiResponse({ status: 200, description: '도서별 리뷰 반환' })
  findById(@Param('userId') userId: string) {
    return this.userbooksService.findDealsByUserId(userId);
  }
}
