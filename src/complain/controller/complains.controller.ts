import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ComplainsService } from '../service/complains.service';
import { CreateComplainsDto } from '../dto/create-complains.dto';
import { UpdateComplainStateDto } from '../dto/update-complains.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('complains')
@Controller('complains')
export class ComplainsController {
  constructor(private readonly complainsService: ComplainsService) {}

  //모든 complain 조회
  @Get()
  @ApiOperation({ summary: '모든 컴플레인 조회' })
  @ApiResponse({ status: 200, description: '모든 컴플레인 조회' })
  findAll() {
    return this.complainsService.findAll();
  }

  //userId로 complain 조회
  @Get('user/:userId')
  @ApiOperation({ summary: '사용자별 컴플레인 조회' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: '사용자별 컴플레인 조회' })
  findByUserId(@Param('userId') userId: string) {
    return this.complainsService.findByUserId(userId);
  }

  //내가 등록한 컴플레인 조회
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 컴플레인 조회' })
  findMyComplains(@CurrentUser() user: any) {
    return this.complainsService.findByUserId(user.id);
  }

  //complain 등록
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '새로운 컴플레인 등록' })
  @ApiResponse({ status: 200, description: '컴플레인 등록 완료' })
  create(@Body() dto: CreateComplainsDto, @CurrentUser() user: any) {
    return this.complainsService.create(dto, user);
  }

  //complainState 변경
  @Patch(':id/state')
  @ApiOperation({ summary: '컴플레인 상태 변경' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: '상태 변경 완료' })
  updateState(@Param('id') id: string, @Body() body: UpdateComplainStateDto) {
    return this.complainsService.updateState(id, body);
  }
}
