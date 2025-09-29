import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChargeDto {
  @ApiProperty({ description: '충전 금액', example: 10000 })
  @IsNumber()
  @Min(1000)
  amount: number;
}
