import { Body, Controller, Get, Post, Param, Delete } from '@nestjs/common';
import { ReviewsService } from '../service/review.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
  @ApiOperation({ summary: '새 리뷰 등록' })
  @ApiResponse({ status: 201, description: '생성된 리뷰 반환' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  create(@Body() createReviewDto: CreateReviewDto) {
    console.log('Received body:', createReviewDto);
    return this.reviewsService.create(createReviewDto);
  }

  //리뷰 삭제 DELETE
  @Delete(':reviewId')
  @ApiOperation({ summary: '리뷰 삭제' })
  @ApiResponse({ status: 201, description: '리뷰 삭제 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '해당 리뷰 없음' })
  delete(@Param('reviewId') id: string) {
    return this.reviewsService.delete(id);
  }
}
