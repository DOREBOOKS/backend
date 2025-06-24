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

export class CreateDealsDto {
  @ApiProperty({
    description: 'The id of the deal',
    example: '6806e9009548c9748fbe1b8x',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The id of the buyer',
    example: '6806e9009548c9748fbe1b8a',
  })
  @IsString()
  buyerId: string;

  @ApiProperty({
    description: 'The id of the seller',
    example: '6806e9009548c9748fbe1b7a',
  })
  @IsString()
  sellerId: string;
}
