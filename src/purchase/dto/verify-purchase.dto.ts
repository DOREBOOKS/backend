import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyPurchaseDto {
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @IsString()
  @IsNotEmpty()
  purchaseToken: string;
}
