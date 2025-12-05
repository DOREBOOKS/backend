import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChannelDto {
  @IsOptional() @IsBoolean() push?: boolean;
  @IsOptional() @IsBoolean() sms?: boolean;
  @IsOptional() @IsBoolean() email?: boolean;
}
class PushTopicsDto {
  @IsOptional() @IsBoolean() bookRegister?: boolean;
  @IsOptional() @IsBoolean() otherMarketing?: boolean;
}

export class UpdateNotificationSettingsDto {
  // 홈 상단 광고성 정보 수신 동의로 전체 on/off
  @IsOptional() @IsBoolean() marketingConsent?: boolean;

  // 야간 수신 동의
  @IsOptional() @IsBoolean() nightConsent?: boolean;

  // 채널 단위 on/off
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelDto)
  channels?: ChannelDto;

  // 푸시 하위 토픽
  @IsOptional()
  @ValidateNested()
  @Type(() => PushTopicsDto)
  pushTopics?: PushTopicsDto;
}
