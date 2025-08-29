import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto {
  @ApiProperty({ description: '이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '프로필 사진', required: false })
  @IsOptional()
  @IsString()
  profilePic?: string;

  @ApiProperty({ description: '은행', example: '신한', required: false })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiProperty({
    description: '계좌번호',
    example: '110526463355',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccount?: string;
}
