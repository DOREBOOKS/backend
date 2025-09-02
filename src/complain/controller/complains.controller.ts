import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ComplainsService } from '../service/complains.service';
import { CreateComplainsDto } from '../dto/complains.dto';

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

  //사용자별 complain 조회
  @Get('user/:writer')
  @ApiOperation({ summary: '사용자별 컴플레인 조회' })
  @ApiParam({ name: 'writer', required: true })
  @ApiResponse({ status: 200, description: '사용자별 컴플레인 조회' })
  findByUserId(@Param('writer') writer: string) {
    return this.complainsService.findByUserId(writer);
  }

  //complain 등록
  @Post()
  @ApiOperation({ summary: '새로운 컴플레인 등록' })
  @ApiResponse({ status: 200, description: '컴플레인 등록 완료' })
  create(@Body() createComplainsDto: CreateComplainsDto) {
    return this.complainsService.create(createComplainsDto);
  }
}
