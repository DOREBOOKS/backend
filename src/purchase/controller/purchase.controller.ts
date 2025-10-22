// purchase.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VerifyPurchaseDto } from '../dto/verify-purchase.dto';
import { VerifyProductDto } from '../dto/verify-product.dto';
import { PurchaseService } from '../service/purchase.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('verify-product')
  async verifyProductPurchase(
    @Body() dto: VerifyProductDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?._id ?? user?.sub;
    console.log('[verify-product] called', {
      userId,
      packageName: dto.packageName,
      productId: dto.productId,
      purchaseToken: mask(dto.purchaseToken),
    });

    try {
      const res = await this.purchaseService.verifyProductPurchase(dto, userId);
      console.log('[verify-product] success', {
        userId,
        success: res?.success,
        coin: res?.coin,
      });
      return res;
    } catch (err) {
      console.error('[verify-product] failed', {
        message: err?.message,
        stack: err?.stack?.split('\n')[0],
      });
      throw err;
    }
  }

  @Post('verify-subscription')
  async verifySubscription(@Body() dto: VerifyPurchaseDto) {
    console.log('[verify-subscription] called', {
      packageName: dto.packageName,
      subscriptionId: dto.subscriptionId,
      purchaseToken: mask(dto.purchaseToken),
    });
    const res = await this.purchaseService.verifySubscriptionPurchase(
      dto.packageName,
      dto.subscriptionId,
      dto.purchaseToken,
    );
    console.log('[verify-subscription] result', {
      success: res?.success,
      state: res?.data?.state,
    });
    return res;
  }

  @Post('debug-log')
  async getDebugPurchaseLog(@Body() dto: VerifyProductDto) {
    console.log('[debug-log] called', {
      packageName: dto.packageName,
      productId: dto.productId,
      purchaseToken: mask(dto.purchaseToken),
    });
    return this.purchaseService.getPurchaseLog(dto);
  }
}

function mask(v?: string) {
  if (!v) return v;
  const s = String(v);
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}
