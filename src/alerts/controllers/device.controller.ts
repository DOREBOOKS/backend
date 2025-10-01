import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DevicesService } from '../services/devices.service';
import { SaveDeviceTokenDto } from '../dto/save-device-token.dto';

@ApiTags('devices')
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('token')
  @ApiOperation({ summary: '디바이스 토큰 등록/업서트' })
  async saveToken(@CurrentUser() user: any, @Body() dto: SaveDeviceTokenDto) {
    const userId = user?.id ?? user?._id ?? user?.sub;
    await this.devices.save(userId, dto.token, {
      platform: dto.platform,
      appVersion: dto.appVersion,
    });
    return { ok: true };
  }

  @Delete('token')
  @ApiOperation({ summary: '내 모든 디바이스 토큰 삭제(로그아웃 시 권장)' })
  async removeMine(@CurrentUser() user: any) {
    const userId = user?.id ?? user?._id ?? user?.sub;
    await this.devices.removeByUser(userId);
    return { ok: true };
  }
}
