import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoodPoint } from '../constants/good-points.enum';

export class UpdateDealsDto {
  @ApiProperty({
    description: 'The price of the book',
    example: '16000',
  })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({
    description: '사용자가 선택한 "어떤 점이 좋았나요?" 태그들',
    enum: GoodPoint,
    isArray: true,
    example: [GoodPoint.CONTENT, GoodPoint.ORGANIZE],
  })
  @IsOptional()
  @IsEnum(GoodPoint, { each: true })
  goodPoints?: GoodPoint[];

  @ApiPropertyOptional({
    description: '한줄평(최대 100자)',
    example: '구성이 알차고 쉽게 읽혀요',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  comment?: string;
}
