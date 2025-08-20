import { IsString, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplainsDto {
  @ApiProperty({ description: 'complain type', example: '시스템 불편사항' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'complain 내용', example: '환불이 안돼요' })
  @IsString()
  text: string;
}

export class ReadComplainsDto {}
