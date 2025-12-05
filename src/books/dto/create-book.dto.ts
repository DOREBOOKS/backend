import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BookStatus, BookType } from '../entities/book.entity';
import { Type } from 'class-transformer';

export class CreateBookDto {
  @ApiProperty({
    description: 'The name of the book',
    example: '정의란 무엇인가',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The name of the author',
    example: '마이클 샌델',
  })
  @IsString()
  author: string;

  @ApiProperty({
    description: 'The name of the publisher',
    example: '동아출판사',
  })
  @IsString()
  publisher: string;

  @ApiProperty({ description: '전자책 대여 가격', example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceRent: number;

  @ApiProperty({ description: '전자책 소장 가격', example: 12000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOwn: number;

  @ApiProperty({
    description: '책 이미지 (파일)',
    type: 'string',
    format: 'binary',
    required: false,
  })
  bookPic: string;

  @ApiProperty({ description: 'category', example: '소설' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'total_time', example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalTime: number;

  @ApiProperty({ description: 'publicationDate', example: '2025-06-02' })
  @IsDateString()
  publicationDate: string;

  @ApiProperty({
    description: 'type',
    enum: BookType,
    example: BookType.NEW,
  })
  @IsEnum(BookType)
  type: BookType;

  @ApiProperty({
    description: 'Details of the book',
    example: '이 책은 어쩌고저쩌고',
  })
  @IsString()
  detail: string;

  @ApiProperty({
    description: 'Table of Contents',
    example: '목차 어쩌고저쩌고',
  })
  @IsString()
  tableOfContents: string;

  @ApiProperty({
    description: 'Publisher Review',
    example: '출판사 평론입니다',
  })
  @IsString()
  publisherReview: string;

  @ApiProperty({ description: 'ISBN', example: '1234567890' })
  @IsString()
  isbn: string;

  @ApiProperty({ description: 'Page count', example: 152 })
  @Type(() => Number)
  @IsNumber()
  page: number;
}
