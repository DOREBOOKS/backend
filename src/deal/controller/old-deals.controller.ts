import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OldDealsService } from '../service/old-deals.service';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

type OldGroupSort = 'popular' | 'recent' | 'review' | 'price';

@ApiTags('old-deals')
@Controller('old-deals')
export class OldDealsController {
  constructor(private readonly oldDeals: OldDealsService) {}

  @Get('books')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '중고 매물 목록(책 단위 그룹핑, 요약만; 딜 상세 제외)',
  })
  @ApiQuery({ name: 'category', required: false, description: '도서 카테고리' })
  @ApiQuery({
    name: 'sort',
    required: false,
    description:
      'popular(인기: 누적 중고거래 수, 동점 시 최신 등록 우선) | recent(발매일 빠른 순) | review(리뷰 많은 순, 동점 시 최신 등록 우선) | price(도서별 최저가 낮은 순, 동점 시 최신 등록 우선)',
  })
  @ApiQuery({ name: 'page', required: false, description: '기본 1' })
  @ApiQuery({ name: 'limit', required: false, description: '기본 20, 최대 50' })
  async listGroupedFlags(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('sort') sort?: OldGroupSort,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // viewerId는 더 이상 필요 없음(딜 상세를 안 내려서 차단 플래그 주입 안 함)
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const sortKey: OldGroupSort = (sort as OldGroupSort) || 'popular';

    // 요약 전용 응답
    return await this.oldDeals.findOldGroupedSummaryByBook({
      category,
      sort: sortKey,
      skip,
      take,
    });
  }

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
