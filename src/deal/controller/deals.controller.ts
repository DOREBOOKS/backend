import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Delete,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateOldDealsDto } from '../dto/create-olddeals.dto';
import { DeleteDealsDto } from '../dto/delete-deals.dto';
import { DealsService } from '../service/deals.service';
import { UpdateDealsDto } from '../dto/update-deals.dto';
import { CreateDealsDto } from '../dto/create-deals.dto';
import { CreateChargeDto } from '../dto/create-charge.dto';
import { CreateToCashDto } from '../dto/create-tocash.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RefundDto } from '../dto/refund.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  //중고책 판매등록
  @Post('register/old')
  @ApiOperation({ summary: '중고책 판매 등록' })
  @ApiResponse({ status: 200, description: '중고책 판매 등록' })
  createOld(@Body() dto: CreateOldDealsDto, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.createOld(dto, userId);
  }

  //등록한 판매 철회
  @Patch('register/:dealId/cancel')
  @ApiOperation({ summary: '등록한 판매 철회(SELLING->MINE' })
  @ApiResponse({ status: 200, description: '판매 철회 완료' })
  cancelRegister(@Param('dealId') dealId: string, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.cancelRegister(dealId, userId);
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
  @Get('register/all')
  @ApiOperation({ summary: '유저별 등록한 중고책 내역 조회' })
  @ApiResponse({
    status: 200,
    description: '유저별 등록한 중고책 내역 조회 완료',
  })
  findRegisterdByUserId(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.findByRegisteredUserId(userId);
  }

  //거래
  @Post('')
  @ApiOperation({ summary: '책 거래' })
  @ApiResponse({ status: 200, description: '책 거래 성공' })
  createDeals(@Body() dto: CreateDealsDto, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.createDeals({ ...dto, buyerId: userId });
  }

  //유저별 거래완료 내역 조회
  @Get('all')
  @ApiOperation({ summary: '유저별 거래완료 내역 조회' })
  @ApiResponse({ status: 200, description: '유저별 거래완료 내역 조회 완료' })
  findDoneByUserId(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.findDoneByUserId(userId);
  }

  //코인 충전
  @Post('coin/charge')
  @ApiOperation({ summary: '코인 충전' })
  @ApiResponse({ status: 200, description: '코인 충전 성공' })
  charge(@Body() body: CreateChargeDto, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.chargeCoins(body, userId);
  }

  //코인 현금전환
  @Post('coin/tocash')
  @ApiOperation({ summary: '코인 현금전환' })
  @ApiResponse({ status: 200, description: '코인 현금전환 성공' })
  toCash(@Body() body: CreateToCashDto, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.coinToCash(body, userId);
  }

  //환불
  @Post('refund')
  @ApiOperation({ summary: '환불' })
  @ApiResponse({ status: 200, description: '환불 성공' })
  refund(@Body() body: RefundDto, @CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.dealsService.refund(body.dealId, userId, body.reason);
  }
}
