// src/publishers/publishers.controller.ts
import { Body, Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublishersService } from '../service/publishers.service';
import { CreatePublisherDto } from '../dto/create-publisher.dto';
import { PublishersEntity } from '../entities/publishers.entity';

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
  async create(@Body() dto: CreatePublisherDto): Promise<PublishersEntity> {
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
    schema: {
      example: {
        items: [
          {
            _id: '665c4b1b3b5c1f8a0b5f1d23',
            name: '도레북스',
            id: 'dorebooks_pub',
            ManagerName: '홍길동',
            contact: '010-1234-5678',
            email: 'pub@example.com',
            location: '서울시 어딘가',
            account: '국민 000-0000-000000',
            childPublisherIds: [],
          },
        ],
        total: 1,
      },
    },
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
  async findOne(@Param('id') id: string): Promise<PublishersEntity> {
    return this.publishersService.findOneById(id);
  }
}
