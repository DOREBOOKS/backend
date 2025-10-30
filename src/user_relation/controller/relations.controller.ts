import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RelationsService } from '../service/relations.service';
import { BlockDto } from '../dto/block.dto';
import { ReportDto } from '../dto/report.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('relations')
export class RelationsController {
  constructor(private readonly relations: RelationsService) {}

  private userHex(user: any) {
    const raw = user?._id ?? user?.id ?? user?.sub ?? user?.userId;
    if (raw?.toHexString) return raw.toHexString();
    return String(raw ?? '');
  }

  @Post('block')
  async block(@CurrentUser() user: any, @Body() dto: BlockDto) {
    const ownerId = this.userHex(user);
    return this.relations.block(ownerId, dto.targetId);
  }

  @Delete('block/:targetId')
  async unblock(@CurrentUser() user: any, @Param('targetId') targetId: string) {
    const ownerId = this.userHex(user);
    return this.relations.unblock(ownerId, targetId);
  }

  @Get('blocked')
  async list(@CurrentUser() user: any) {
    const ownerId = this.userHex(user);
    return this.relations.listBlocked(ownerId);
  }

  @Post('report')
  async report(@CurrentUser() user: any, @Body() dto: ReportDto) {
    const ownerId = this.userHex(user);
    return this.relations.report(
      ownerId,
      dto.targetId,
      dto.text,
      dto.reason,
      dto.contextId,
    );
  }
}
