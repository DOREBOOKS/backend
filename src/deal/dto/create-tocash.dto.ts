import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateToCashDto {
  @ApiProperty({ description: 'userId', example: '686f73558a1162472f519ea0' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '현금전환 금액', example: 5000 })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ description: '거래일자', required: true })
  @Type(() => Date)
  dealDate?: string;
}
