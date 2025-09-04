import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class NoticeDto {
  @IsBoolean()
  @Type(() => Boolean)
  notice: boolean;

  @IsOptional()
  @IsIn(['ANY', 'NEW', 'OLD'])
  noticeType?: 'ANY' | 'NEW' | 'OLD';
}
