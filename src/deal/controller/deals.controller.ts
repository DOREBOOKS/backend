import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateOldDealsDto } from '../dto/create-olddeals.dto';
import { DeleteDealsDto } from '../dto/delete-deals.dto';
import { DealsService } from '../service/deals.service';
import { UpdateDealsDto } from '../dto/update-deals.dto';
import { CreateDealsDto } from '../dto/create-deals.dto';

@ApiTags('deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  //중고책 판매등록
  @Post('register/old')
  @ApiOperation({ summary: '중고책 판매 등록' })
  @ApiResponse({ status: 200, description: '중고책 판매 등록' })
  createOld(@Body() CreateOldDealsDto: CreateOldDealsDto) {
    return this.dealsService.createOld(CreateOldDealsDto);
  }

  //등록한 판매 삭제
  @Delete('register/:dealId')
  @ApiOperation({ summary: '등록한 판매 삭제' })
  @ApiResponse({ status: 200, description: '등록된 판매 삭제 완료' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '해당 판매 없음' })
  deleteRegister(@Param('dealId') registerId: string) {
    return this.dealsService.deleteDeals(registerId);
  }

  //등록한 판매 수정
  @Put('register/:dealId')
  @ApiOperation({ summary: '등록한 판매 수정' })
  @ApiResponse({ status: 200, description: '등록한 판매 수정 완료' })
  updateRegister(
    @Param('dealId') registerId: string,
    @Body() updateDealsDto: UpdateDealsDto,
  ) {
    return this.dealsService.updateDeals(registerId, updateDealsDto);
  }

  //유저별 등록한 중고책 내역 조회
  @Get('register/all/:userId')
  @ApiOperation({ summary: '유저별 등록한 중고책 내역 조회' })
  @ApiResponse({
    status: 200,
    description: '유저별 등록한 중고책 내역 조회 완료',
  })
  findRegisterdByUserId(@Param('userId') userId: string) {
    return this.dealsService.findByRegisteredUserId(userId);
  }

  //거래
  @Post('')
  @ApiOperation({ summary: '책 거래' })
  @ApiResponse({ status: 200, description: '책 거래 성공' })
  createDeals(@Body() CreateDealsDto: CreateDealsDto) {
    return this.dealsService.createDeals(CreateDealsDto);
  }

  //유저별 거래완료 내역 조회
  @Get('all/:userId')
  @ApiOperation({ summary: '유저별 거래완료 내역 조회' })
  @ApiResponse({ status: 200, description: '유저별 거래완료 내역 조회 완료' })
  findDoneByUserId(@Param('userId') userId: string) {
    return this.dealsService.findDoneByUserId(userId);
  }
}
