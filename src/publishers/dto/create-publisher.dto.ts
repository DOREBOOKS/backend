import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreatePublisherDto {
  @ApiProperty({ description: '출판사명' })
  @IsString()
  name: string;

  @ApiProperty({ description: '로그인용 아이디', example: 'doReBooksPub01' })
  @IsString()
  id: string;

  @ApiProperty({ description: '로그인 비밀번호 (해시 전 원문)', minLength: 4 })
  @IsString()
  password: string;

  @ApiProperty({ description: '담당자 이름' })
  @IsString()
  ManagerName: string;

  @ApiProperty({ description: '담당자 연락처', example: '010-1234-5678' })
  @IsString()
  contact: string;

  @ApiProperty({ description: '담당자 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '출판사 본사 위치', example: '서울시 어딘가' })
  @IsString()
  location: string;

  @ApiProperty({ description: '정산용 법인 계좌번호' })
  @IsString()
  account: string;

  @ApiProperty({
    description: '자회사/하위 출판사 ObjectId 리스트(옵션)',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  childPublisherIds?: string[];
}
