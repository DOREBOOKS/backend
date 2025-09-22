import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealCondition } from './create-deals.dto';
import { GoodPoint } from '../constants/good-points.enum';

export class CreateOldDealsDto {
  @ApiProperty({
    description: 'The ID of the deal',
    example: '6883186cda3267ff3e8d5aa1',
  })
  @IsString()
  dealId: string;

  @ApiProperty({
    description: 'The price of the book',
    example: '15000',
  })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'total_time', example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainTime: number;

  @ApiPropertyOptional({
    description: '사용자가 선택한 "어떤 점이 좋았나요?" 태그들',
    enum: GoodPoint,
    isArray: true,
    example: [GoodPoint.FAV, GoodPoint.FAST],
  })
  @IsEnum(GoodPoint, { each: true })
  goodPoints: GoodPoint[];

  @ApiPropertyOptional({
    description: '한줄평(최대 100자)',
    example: '이 책 정말 좋아요!',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  comment?: string;

  @ApiPropertyOptional({
    description: '등록일자',
    example: '2025-11-21',
  })
  @IsOptional()
  @IsString()
  registerDate?: string;
}
