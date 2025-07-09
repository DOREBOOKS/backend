import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadBookDto {
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

  @ApiProperty({ description: 'price', example: '3000' })
  @IsString()
  price: number;

  @ApiProperty({ description: 'bookpic', example: '' })
  @IsString()
  book_pic: string;

  @ApiProperty({ description: 'category', example: '' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'total_time', example: '3000' })
  @IsInt()
  total_time: number;

  @ApiProperty({ description: 'status', example: '판매중' })
  @IsString()
  status: string;
}

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

  @ApiProperty({ description: 'price', example: '3000' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'bookpic', example: '' })
  @IsString()
  book_pic: string;

  @ApiProperty({ description: 'category', example: '' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'total_time', example: '3000' })
  @IsInt()
  @Min(0)
  total_time: number;

  @ApiProperty({ description: 'status', example: '판매중' })
  @IsString()
  status: string;
}
