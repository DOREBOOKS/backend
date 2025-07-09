import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto';

export class LoginDto {
  @ApiProperty({ description: '이메일', example: 'example@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호', example: 'password123' })
  @IsString()
  password: string;
}

export class SignupDto extends CreateUserDto {}
