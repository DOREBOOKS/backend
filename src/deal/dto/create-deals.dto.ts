import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DealType {
  NEW = 'NEW',
  OLD = 'OLD',
}

export class CreateDealsDto {
  @ApiProperty({
    description: '구매자 ID',
    example: '686f73558a1162472f519ea0',
  })
  @IsString()
  buyerId: string;

  @ApiProperty({
    description: '판매자 ID',
    example: '6806e9009548c9748fbe1b7a',
  })
  @IsString()
  sellerId: string;

  @ApiProperty({ description: '도서 ID', example: '68aabbccdd1122334455' })
  @IsString()
  bookId: string;

  @ApiProperty({ description: '도서 상태', example: '필기 있음' })
  @IsString()
  condition: string;

  @ApiProperty({ description: '가격', example: 15000 })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: '거래 타입',
    enum: DealType,
    example: DealType.OLD,
  })
  @IsEnum(DealType)
  type: DealType;

  @ApiProperty({
    description: '등록일',
    example: '2025-03-15',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  registerDate?: Date;

  @ApiProperty({
    description: '거래일',
    example: '2025-03-20',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  dealDate?: Date;
}
