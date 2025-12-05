import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { HistoryService } from '../service/history.service';
import { SaveSuggestClickDto } from '../dto/save-click.dto';
import { ListQueryDto } from '../dto/list.dto';

@ApiTags('history')
@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post('search/click')
  @ApiOperation({ summary: '제안어 클릭 후 상세 이동 기록 저장' })
  @ApiResponse({ status: 201, description: '저장 성공' })
  async saveSuggestClick(@Req() req, @Body() dto: SaveSuggestClickDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.historyService.saveSuggestClick(userId, dto);
  }

  // 최근 검색어(=제안어 클릭 기록) 조회
  @Get('search/recent')
  @ApiOperation({ summary: '최근 검색어(상세 이동 기록) 조회' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '최대 개수(기본 10, 최대 50)',
  })
  async recent(@Req() req, @Query() q: ListQueryDto) {
    const userId = req.user?.sub ?? req.user?.id;
    const items = await this.historyService.recentSuggestClicks(
      userId,
      q.limit,
    );
    return { items };
  }

  @Delete('search/recent')
  @ApiOperation({ summary: '키워드로 최근 검색어 삭제' })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: '삭제할 검색어(정확 일치)',
  })
  async deleteRecentByKeyword(@Req() req, @Query('keyword') keyword: string) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.historyService.deleteByKeyword(userId, keyword);
  }
}
