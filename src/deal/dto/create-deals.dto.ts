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
  @ApiPropertyOptional({
    description: '구매자 ID(토큰에서 주입됨)',
    example: '686f73558a1162472f519ea0',
  })
  @IsOptional()
  @IsString()
  buyerId?: string;

  @ApiPropertyOptional({
    description: '판매자 ID(OLD 거래시 필요)',
    example: '6806e9009548c9748fbe1b7a',
  })
  @IsOptional()
  @ValidateIf((o) => o.type === DealType.OLD)
  @IsString()
  sellerId?: string;

  @ApiProperty({ description: '도서 ID', example: '68aabbccdd1122334455' })
  @IsString()
  bookId: string;

  @ApiProperty({
    description: '거래 종류(소장/대여)',
    enum: DealCondition,
    example: 'RENT',
  })
  @IsEnum(DealCondition)
  condition: DealCondition;

  @ApiProperty({
    description: '거래 타입',
    enum: DealType,
    example: DealType.OLD,
  })
  @IsEnum(DealType)
  type: DealType;

  @ApiProperty({
    description: '거래일',
    example: '2025-03-20',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  dealDate?: Date;
}
