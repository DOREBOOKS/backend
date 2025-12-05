import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly noti: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('isRead') isRead?: string) {
    const userId = user.id ?? user._id ?? user.sub;
    const flag = typeof isRead === 'string' ? isRead === 'true' : undefined;
    return this.noti.list(userId, flag);
  }

  @Patch(':notiId/read')
  markRead(@Param('notiId') notiId: string, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.noti.markRead(userId, notiId);
  }
}
