import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOldDealsDto {
  @ApiProperty({
    description: 'User ID',
    example: '66501137c14c3abf12345678',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'The ID of the book',
    example: '342342535235253266666',
  })
  @IsString()
  bookId: string;

  @ApiProperty({
    description: 'The price of the book',
    example: '15000',
  })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'total_time', example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainTime: number;

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
