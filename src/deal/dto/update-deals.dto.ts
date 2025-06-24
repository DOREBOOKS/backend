import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDealsDto {
  @ApiProperty({
    description: 'The price of the book',
    example: '16000',
  })
  @IsString()
  price: string;
}
