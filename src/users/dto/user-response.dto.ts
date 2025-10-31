import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationSettings } from '../entities/user.entity';
export class UserResponseDto {
  @ApiProperty({ description: '사용자 ID', example: '12345' })
  @IsString()
  id: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  @IsString()
  name: string;

  @ApiProperty({ description: '닉네임', example: '고독한 두루미' })
  @IsString()
  nickname: string;

  @ApiProperty({ description: '이메일', example: 'example@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '성별', example: 'male', required: false })
  @IsString()
  gender?: string;

  @ApiProperty({ description: '나이', example: 25, required: false })
  @IsNumber()
  age?: number;

  @ApiProperty({ description: '은행', example: '신한', required: false })
  @IsString()
  bank?: string;

  @ApiProperty({
    description: '계좌번호',
    example: '110526463355',
    required: false,
  })
  @IsString()
  bankAccount?: string;

  @ApiProperty({
    description: '프로필 사진 URL',
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  profilePic?: string;

  @ApiProperty({ description: '가입 일시', example: '2023-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정 일시', example: '2023-01-01T00:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ description: '보유 코인', example: 1000 })
  @IsInt()
  @Min(0)
  coin: number;

  @ApiProperty({
    description: '동의 json',
    required: false,
  })
  notificationSettings?: NotificationSettings;
}
