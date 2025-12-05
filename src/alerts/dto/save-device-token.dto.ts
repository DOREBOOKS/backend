import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveDeviceTokenDto {
  @ApiProperty({ example: 'fcm_token_string' })
  @IsString()
  @Length(10, 4096)
  token!: string;

  @ApiProperty({
    example: 'android',
    required: false,
    enum: ['android', 'ios'],
  })
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: 'android' | 'ios';

  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
