import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReadDealsDto {
  @ApiProperty({
    description: 'The name of the book',
    example: '정의란 무엇인가?',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The name of the author',
    example: '마이클 샌델',
  })
  @IsString()
  author: string;

  @ApiProperty({
    description: 'The price of the book',
    example: '15000',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'The condition of the book',
    example: '필기 있음',
  })
  @IsString()
  condition: string;

  @ApiProperty({
    description: 'Register Date',
    example: '2025-03-15',
  })
  @IsString()
  registerDate: Date;
}
