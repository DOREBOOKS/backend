import {
  Controller,
  Patch,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HeartInterestsService } from '../services/heart-interests.service';
import { NoticeInterestsService } from '../services/notice-interests';
import { HeartDto } from '../dto/heart.dto';
import { NoticeDto } from '../dto/notice.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('book-interest')
export class BookInterestsController {
  constructor(
    private readonly hearts: HeartInterestsService,
    private readonly notices: NoticeInterestsService,
  ) {}

  @Get(':bookId/heart')
  async getHeartState(
    @Param('bookId') bookId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.hearts.getHeartState(userId, bookId);
  }

  @Patch(':bookId/heart')
  heart(
    @Param('bookId') bookId: string,
    @CurrentUser() user: any,
    @Body() dto: HeartDto,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.hearts.upsertHeart(userId, bookId, dto.heart);
  }

  @Patch(':bookId/notice')
  notice(
    @Param('bookId') bookId: string,
    @CurrentUser() user: any,
    @Body() dto: NoticeDto,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.notices.upsertNotice(
      userId,
      bookId,
      dto.notice,
      dto.noticeType ?? 'ANY',
    );
  }

  @Get('heart')
  heartList(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.hearts.list(userId);
  }

  @Get(':bookId/notice')
  async getNoticeState(
    @Param('bookId') bookId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.notices.getNoticeState(userId, bookId);
  }

  @Patch('notice')
  noticeByKey(@CurrentUser() user: any, @Body() dto: NoticeDto) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.notices.upsertNoticeByKey(userId, dto);
  }

  @Get('notice')
  noticeList(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.notices.list(userId);
  }

  @Delete(':noticeId/notice')
  cancelNoticeByNoticeId(
    @Param('noticeId') noticeId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.notices.cancelByNoticeId(userId, noticeId);
  }
}
