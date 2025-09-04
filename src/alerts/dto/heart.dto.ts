import { IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class HeartDto {
  @IsBoolean()
  @Type(() => Boolean)
  heart: boolean;
}
