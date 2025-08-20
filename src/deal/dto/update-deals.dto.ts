import { Type } from 'class-transformer';
import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDealsDto {
  @ApiProperty({
    description: 'The price of the book',
    example: '16000',
  })
  @IsNumber()
  price: number;
}
