import { Type } from 'class-transformer';
import { IsString, IsInt, Min, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadReviewDto {
  @ApiProperty({
    description: 'The name of the writer',
    example: 'SJSJ',
  })
  @IsString()
  name: string;

  @ApiProperty({ description: '리뷰 제목', example: '정말 좋은 책!' })
  @IsString()
  title: string;

  @ApiProperty({ description: '평점', example: 5 })
  @IsInt()
  @Min(1)
  rating: number;

  @ApiProperty({ description: '코멘트', example: '재미있고 유익했어요.' })
  @IsString()
  comment: string;

  @ApiProperty({ description: '등록 날짜', example: '2024-05-26T10:00:00' })
  @IsDate()
  @Type(() => Date)
  created_at: Date;
}
