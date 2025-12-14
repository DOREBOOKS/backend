import { Body, Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublishersService } from '../service/publishers.service';
import { CreatePublisherDto } from '../dto/create-publisher.dto';
import { PublishersEntity } from '../entities/publishers.entity';
import { PublisherBookStatsDto } from '../dto/read-publisher-book-stats.dto';
import { PublishersInterface } from '../interfaces/publishers.interface';

@ApiTags('publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  //출판사 등록
  @Post()
  @ApiOperation({ summary: '출판사 등록' })
  @ApiResponse({
    status: 201,
    description: '출판사 등록 성공',
    type: PublishersEntity,
  })
  async create(@Body() dto: CreatePublisherDto): Promise<PublishersInterface> {
    return this.publishersService.create(dto);
  }

  //출판사 목록 조회
  @Get()
  @ApiOperation({ summary: '출판사 목록 조회' })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '출판사명 또는 아이디 검색 키워드',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호(기본값 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 개수(기본값 20, 최대 100)',
  })
  @ApiResponse({
    status: 200,
    description: '출판사 목록',
  })
  async findAll(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.publishersService.findAll({
      keyword,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return result;
  }

  //id로 출판사 조회
  @Get(':id')
  @ApiOperation({ summary: '출판사 단건 조회' })
  @ApiResponse({ status: 200, type: PublishersEntity })
  async findOne(@Param('id') id: string): Promise<PublishersInterface> {
    return this.publishersService.findOneById(id);
  }

  //출판사별 도서 권수 조회(총 권수, 중고거래 지원, 오디오북 지원, 중고거래 미지원 도서)
  @Get(':id/book-stats')
  @ApiOperation({
    summary: '출판사별 도서 권수 통계',
    description:
      '총 도서 수, 중고거래 지원 도서 수, 오디오북 지원 도서 수, 중고거래 미지원 도서 수를 조회합니다.',
  })
  @ApiResponse({ status: 200, type: PublisherBookStatsDto })
  async getBookStats(@Param('id') id: string): Promise<PublisherBookStatsDto> {
    return this.publishersService.getBookStatsByPublisher(id);
  }
}
