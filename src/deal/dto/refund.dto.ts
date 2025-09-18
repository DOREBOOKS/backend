import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundDto {
  @ApiProperty({
    description: 'the id of the deal',
    example: '68c00aa8cb613df0804d1b7a',
  })
  @IsMongoId()
  dealId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
