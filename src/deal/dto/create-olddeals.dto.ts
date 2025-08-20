import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOldDealsDto {
  @ApiProperty({
    description: 'User ID',
    example: '686f73558a1162472f519ea0',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'The ID of the deal',
    example: '6883186cda3267ff3e8d5aa1',
  })
  @IsString()
  dealId: string;

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

  @IsOptional()
  @IsString()
  registerDate?: string;
}
