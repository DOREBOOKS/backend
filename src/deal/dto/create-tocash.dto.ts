import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateToCashDto {
  @ApiProperty({ description: '현금전환 금액', example: 5000 })
  @IsNumber()
  @Min(5000)
  amount: number;

  @ApiProperty({ description: '거래일자', required: true })
  @Type(() => Date)
  dealDate?: string;
}
