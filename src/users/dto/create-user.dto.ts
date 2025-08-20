import { IsString, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'The name of the user', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '나이', required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiProperty({ description: '성별', required: false, example: 'male' })
  @IsOptional()
  @IsString()
  gender?: 'male' | 'female';

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({
    description: '소셜 로그인 제공자',
    example: 'kakao',
  })
  @IsOptional()
  @IsString()
  social: 'local' | 'kakao' | 'naver' | 'google' | 'apple';

  @ApiProperty({
    description: '프로필 사진 URL',
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  profilePic?: string;
}
