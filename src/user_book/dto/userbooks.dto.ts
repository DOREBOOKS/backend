import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadUserBookDto {
  @ApiProperty({
    description: 'The name of the book',
    example: '정의란 무엇인가?',
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
    example: '길벗출판사',
  })
  @IsString()
  publisher: string;

  @ApiProperty({ description: 'remaining time', example: '17' })
  @IsNumber()
  remain_time: number;

  @ApiProperty({ description: 'book status', example: 'SELLABLE' })
  @IsString()
  book_status: string;
}
