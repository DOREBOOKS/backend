import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ComplainState } from 'src/common/constants/complains-state.enum';

export class CreateComplainsDto {
  @ApiProperty({ description: 'complain type', example: '시스템 불편사항' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'complain 내용', example: '환불이 안돼요' })
  @IsString()
  text: string;

  @ApiProperty({
    description: '회신 받을 이메일(선택)',
    example: 'seungjinlee09@naver.com',
  })
  @IsOptional()
  @IsEmail()
  replyEmail?: string;

  @ApiProperty({
    description: '초기 상태(선택, 기본: 처리전)',
    enum: ComplainState,
  })
  @IsEnum(ComplainState)
  state: ComplainState;
}

export class ReadComplainsDto {}
