import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockDto {
  @ApiProperty({
    description: '신고하고싶은 userId',
    example: '6900947d6d5dde02c505a1cc',
  })
  @IsString()
  targetId: string;
}
