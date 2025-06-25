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
}
