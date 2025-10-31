import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportDto {
  @ApiProperty({
    description: '신고하고싶은 userId',
    example: '6900947d6d5dde02c505a1cc',
  })
  @IsString()
  targetId: string;

  @ApiProperty({
    description: '신고 이유',
    example: 'abcded',
  })
  @IsOptional()
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'text',
    example: 'abcded',
  })
  @IsOptional()
  @IsString()
  text: string;

  @ApiProperty({
    description: 'contextId',
    example: '6900c65c6d5dde02c505a1e1',
  })
  @IsString()
  contextId: string;
}
