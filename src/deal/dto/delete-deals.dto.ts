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

export class DeleteDealsDto {
  @ApiProperty({
    description: 'The name of the book',
    example: '정의란 무엇인가?',
  })
  @IsString()
  title: string;
}
