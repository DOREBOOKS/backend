import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  Min,
  IsDate,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoodPoint } from 'src/common/constants/good-points.enum';

export class CreateReviewDto {
  @ApiProperty({ description: '도서 ID', example: '6879ecb1e1bc60bcd5c7af78' })
  @IsString()
  bookId: string;

  // @ApiProperty({
  //   description: '작성자 ID',
  //   example: '686fceeb7b1953c187738f8f',
  // })
  // @IsString()
  // userId: string;

  @ApiProperty({ description: '코멘트', example: '재미있고 유익했어요.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({
    description: '사용자가 선택한 "어떤 점이 좋았나요?" 태그들',
    enum: GoodPoint,
    isArray: true,
    example: [GoodPoint.FAV, GoodPoint.FAST],
  })
  @IsEnum(GoodPoint, { each: true })
  goodPoints: GoodPoint[];
}
