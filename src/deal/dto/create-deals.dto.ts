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

  // @ApiPropertyOptional({
  //   description: '구매자 ID(토큰에서 주입됨)',
  //   example: '686f73558a1162472f519ea0',
  // })
  // @IsOptional()
  // @IsString()
  // buyerId?: string;

  // @ApiPropertyOptional({
  //   description: '판매자 ID(OLD 거래시 필요)',
  //   example: '6806e9009548c9748fbe1b7a',
  // })
  // @IsOptional()
  // @ValidateIf((o) => o.type === DealType.OLD)
  // @IsString()
  // sellerId?: string;

  @ApiProperty({
    description: '거래 타입',
    enum: DealType,
    example: DealType.OLD,
  })
  @IsEnum(DealType)
  type: DealType;
}
