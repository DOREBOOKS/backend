import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ComplainState } from 'src/common/constants/complains-state.enum';

export class UpdateComplainStateDto {
  @ApiProperty({ enum: ComplainState })
  @IsEnum(ComplainState)
  state: ComplainState;
}
