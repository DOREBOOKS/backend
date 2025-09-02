import { IsString, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplainsDto {
  @ApiProperty({ description: 'complain type', example: '시스템 불편사항' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'complain 내용', example: '환불이 안돼요' })
  @IsString()
  text: string;

  @ApiProperty({ description: '발신자', example: '보내는사람 이름' })
  @IsString()
  writer?: string;

  @ApiProperty({ description: '회신 받을 이메일(선택)' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;
}

export class ReadComplainsDto {}
