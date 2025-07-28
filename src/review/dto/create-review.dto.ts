import { Type } from 'class-transformer';
import { IsString, IsInt, Min, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: '도서 ID', example: '6879ecb1e1bc60bcd5c7af78' })
  @IsString()
  bookId: string;

  @ApiProperty({
    description: '작성자 ID',
    example: '686f73558a1162472f519ea0',
  })
  @IsString()
  userId: string;

  @ApiProperty({ description: '평점', example: 5 })
  @IsInt()
  @Min(1)
  rating: number;

  @ApiProperty({ description: '코멘트', example: '재미있고 유익했어요.' })
  @IsString()
  comment: string;
}
