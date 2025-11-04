import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OldDealsService } from '../service/old-deals.service';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('old-deals')
@Controller('old-deals')
export class OldDealsController {
  constructor(private readonly oldDeals: OldDealsService) {}

  // 최근 중고 매물 목록
  //   @Get('books/recent')
  //   @ApiOperation({ summary: '최근 등록된 중고 매물' })
  //   @ApiQuery({ name: 'limit', required: false, description: '최대 50' })
  //   async recent(@Query('limit') limit?: string) {
  //     const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  //     return this.oldDeals.findRecent(take);
  //   }

  // 최근 중고 매물 (차단 플래그 포함)
  @Get('books/recent/flags')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '최근 등록된 중고 매물(차단 플래그 포함)' })
  @ApiQuery({ name: 'limit', required: false, description: '최대 50' })
  async recentFlags(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const viewerId =
      user?._id?.toHexString?.() ?? user?.id ?? user?.sub ?? user?.userId ?? '';
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const base = await this.oldDeals.findRecent(take);
    const items = await this.oldDeals.annotateBlocked(viewerId, base.items);
    return { ...base, items };
  }

  // 특정 책의 중고 매물
  //   @Get('books/:bookId')
  //   @ApiOperation({ summary: '도서별 중고 매물 목록' })
  //   @ApiParam({ name: 'bookId', description: '도서 ID' })
  //   @ApiQuery({ name: 'page', required: false, description: '기본 1' })
  //   @ApiQuery({ name: 'limit', required: false, description: '기본 20' })
  //   async byBook(
  //     @Param('bookId') bookId: string,
  //     @Query('page') page?: string,
  //     @Query('limit') limit?: string,
  //   ) {
  //     const take = Math.max(Number(limit) || 20, 1);
  //     const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  //     return this.oldDeals.findByBook(bookId, skip, take);
  //   }

  // 책별 중고 매물(차단 플래그 포함)
  @Get('books/:bookId/flags')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '도서별 중고 매물(차단 플래그 포함)' })
  @ApiParam({ name: 'bookId', description: '도서 ID' })
  @ApiQuery({ name: 'page', required: false, description: '기본 1' })
  @ApiQuery({ name: 'limit', required: false, description: '기본 20' })
  async byBookFlags(
    @Param('bookId') bookId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const viewerId =
      user?._id?.toHexString?.() ?? user?.id ?? user?.sub ?? user?.userId ?? '';
    const take = Math.max(Number(limit) || 20, 1);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const base = await this.oldDeals.findByBook(bookId, skip, take);
    const items = await this.oldDeals.annotateBlocked(viewerId, base.items);
    return { ...base, items };
  }

  // 가격 히스토리/카운트
  @Get('books/:bookId/stats')
  @ApiOperation({ summary: '도서별 중고 매물 통계(가격/개수)' })
  @ApiParam({ name: 'bookId', description: '도서 ID' })
  stats(@Param('bookId') bookId: string) {
    return this.oldDeals.getStatsByBookId(bookId);
  }
}
