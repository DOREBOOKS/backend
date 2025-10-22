import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VerifyPurchaseDto } from '../dto/verify-purchase.dto';
import { VerifyProductDto } from '../dto/verify-product.dto';
import { PurchaseService } from '../service/purchase.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
//import { Verify } from 'crypto';

@UseGuards(JwtAuthGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('verify-product')
  async verifyProductPurchase(
    @Body() dto: VerifyProductDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.purchaseService.verifyProductPurchase(dto, userId);
  }

  @Post('verify-subscription')
  async verifySubscription(@Body() dto: VerifyPurchaseDto) {
    const { packageName, subscriptionId, purchaseToken } = dto;
    return this.purchaseService.verifySubscriptionPurchase(
      packageName,
      subscriptionId,
      purchaseToken,
    );
  }

  @Post('debug-log')
  async getDebugPurchaseLog(
    @Body() dto: VerifyProductDto,
    // @CurrentUser() user: any, // 사용자 정보는 로그 조회에 필수가 아니므로 생략 가능
  ) {
    return this.purchaseService.getPurchaseLog(dto);
  }
}
