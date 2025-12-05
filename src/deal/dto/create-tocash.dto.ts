import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateToCashDto {
  @ApiProperty({ description: '현금전환 금액', example: 5000 })
  @Type(() => Number)
  @IsNumber()
  @Min(5000)
  amount: number;

  @ApiProperty({
    description: '은행명',
    example: '국민은행',
  })
  @IsString()
  bank: string;

  @ApiProperty({
    description: '계좌번호 (숫자/하이픈/공백 허용)',
    example: '123-456-789012',
  })
  @IsString()
  @Matches(/^[0-9\- ]+$/, {
    message: '계좌번호는 숫자, 하이픈(-), 공백만 입력 가능합니다',
  })
  bankAccount: string;
}
