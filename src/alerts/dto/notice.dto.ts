import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class NoticeDto {
  @ApiProperty({
    description: 'notice',
    example: 'true',
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  notice: boolean;

  @ApiProperty({
    description: 'noticeType',
    example: 'NEW',
    required: false,
  })
  @IsOptional()
  @IsIn(['ANY', 'NEW', 'OLD'])
  noticeType?: 'ANY' | 'NEW' | 'OLD';

  @IsOptional() @IsString() bookId?: string;
  @IsOptional() @IsString() isbn?: string;

  @ApiProperty({
    description: 'title',
    example: '경험의 힘',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'author',
    example: '크리스틴 로프',
    required: false,
  })
  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional() @IsString() publisher?: string;
}
