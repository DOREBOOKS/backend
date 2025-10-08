import { Controller, Post, Body } from '@nestjs/common';
import { VerifyPurchaseDto } from '../dto/verify-purchase.dto';
import { VerifyProductDto } from '../dto/verify-product.dto';
import { PurchaseService } from '../service/purchase.service';
//import { Verify } from 'crypto';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('verify-product')
  async verifyProductPurchase(@Body() dto: VerifyProductDto) {
    return this.purchaseService.verifyProductPurchase(dto);
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
}
