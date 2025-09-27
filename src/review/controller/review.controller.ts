import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from '../service/review.service';
import { CreateReviewDto } from '../dto/create-review.dto';
// import { ReadReviewDto } from '../dto/read-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  //전체 리뷰 조회 GET
  @Get()
  @ApiOperation({ summary: '모든 리뷰 조회' })
  @ApiResponse({ status: 200, description: '모든 리뷰 반환' })
  findAll() {
    return this.reviewsService.findAll();
  }

  //특정 도서의 리뷰 조회 GET
  @Get('book/:bookId')
  @ApiOperation({ summary: '도서별 리뷰 조회' })
  @ApiResponse({ status: 200, description: '도서별 리뷰 반환' })
  findByBookId(@Param('bookId') bookId: string) {
    return this.reviewsService.findByBookId(bookId);
  }

  //리뷰 등록 POST
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '새 리뷰 등록(로그인 사용자)' })
  @ApiResponse({ status: 201, description: '생성된 리뷰 반환' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: any) {
    return this.reviewsService.create(dto, user);
  }

  //리뷰 수정 Patch
  @Patch(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 수정(작성자 본인)' })
  @ApiResponse({ status: 200, description: '수정된 리뷰 반환' })
  update(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.update(reviewId, dto, user);
  }

  //리뷰 삭제 DELETE
  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '리뷰 삭제(작성자 본인)' })
  @ApiResponse({ status: 200, description: '리뷰 삭제 성공' })
  delete(@Param('reviewId') id: string, @CurrentUser() user: any) {
    return this.reviewsService.delete(id, user);
  }
}
