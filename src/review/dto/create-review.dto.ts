import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  Min,
  IsDate,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoodPoint } from 'src/common/constants/good-points.enum';

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

  @ApiProperty({ description: '코멘트', example: '재미있고 유익했어요.' })
  @IsOptional()
  @IsString()
  comment: string;

  @ApiProperty({
    description: '사용자가 선택한 "어떤 점이 좋았나요?" 태그들',
    enum: GoodPoint,
    isArray: true,
    example: [GoodPoint.FAV, GoodPoint.FAST],
  })
  @IsEnum(GoodPoint, { each: true })
  goodPoints?: GoodPoint[];
}
