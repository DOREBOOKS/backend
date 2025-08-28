import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChargeDto {
  @ApiProperty({ description: 'userId', example: '686f73558a1162472f519ea0' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '충전 금액', example: 10000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: '충전 날짜', required: true })
  @Type(() => Date)
  dealDate?: string;
}
