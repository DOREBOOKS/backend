import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DealType {
  NEW = 'NEW',
  OLD = 'OLD',
}

export enum DealCondition {
  RENT = 'RENT',
  OWN = 'OWN',
}

export class CreateDealsDto {
  //중고거래시에만 필수
  @ApiPropertyOptional({
    description: '중고 등록글 ID (OLD 구매 시 필수)',
    example: '68d62c7c672769b11a0b50c7',
  })
  @ValidateIf((o) => o.type === DealType.OLD)
  @IsString()
  dealId?: string;

  //신규거래일때만 필수
  @ApiPropertyOptional({
    description: '도서 ID (NEW 구매 시 필수)',
    example: '68d3ad11a4615ab0873ab2c3',
  })
  @ValidateIf((o) => o.type === DealType.NEW)
  @IsString()
  bookId?: string;

  @ApiPropertyOptional({
    description: '거래 종류(소장/대여) — NEW에서만 사용',
    enum: DealCondition,
    example: 'RENT',
  })
  @ValidateIf((o) => o.type === DealType.NEW)
  @IsEnum(DealCondition)
  condition?: DealCondition;

  @ApiProperty({
    description: '거래 타입',
    enum: DealType,
    example: DealType.OLD,
  })
  @IsEnum(DealType)
  type: DealType;
}
