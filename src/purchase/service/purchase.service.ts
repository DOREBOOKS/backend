import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from '../entities/purchase.entity';
import { VerifyProductDto } from '../dto/verify-product.dto';
import { COIN_PRICE } from '../constants/coin_price';
import { CreateChargeDto } from 'src/deal/dto/create-charge.dto';
import { DealsService } from 'src/deal/service/deals.service';
import { UsersService } from 'src/users/service/users.service';

@Injectable()
export class PurchaseService {
  private androidPublisher;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    private readonly dealsService: DealsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    this.init().catch((e) =>
      console.error('[init] constructor failed:', safeMsg(e)),
    );
  }

  private async init() {
    console.log('[init] start GoogleAuth setup');
    try {
      const privateKey = this.configService.get<string>(
        'SERVICE_ACCOUNT_PRIVATE_KEY',
      );
      const clientEmail = this.configService.get<string>(
        'SERVICE_ACCOUNT_CLIENT_EMAIL',
      );
      if (!privateKey || !clientEmail) {
        console.error('[init] missing service account env vars');
        throw new Error('Missing GOOGLE SERVICE ACCOUNT credentials');
      }

      const credentials = {
        type: this.configService.get<string>('SERVICE_ACCOUNT_TYPE'),
        project_id: this.configService.get<string>(
          'SERVICE_ACCOUNT_PROJECT_ID',
        ),
        private_key_id: this.configService.get<string>(
          'SERVICE_ACCOUNT_PRIVATE_KEY_ID',
        ),
        private_key: privateKey.replace(/\\n/g, '\n'),
        client_email: clientEmail,
        client_id: this.configService.get<string>('SERVICE_ACCOUNT_CLIENT_ID'),
        auth_uri: this.configService.get<string>('SERVICE_ACCOUNT_AUTH_URI'),
        token_uri: this.configService.get<string>('SERVICE_ACCOUNT_TOKEN_URI'),
        auth_provider_x509_cert_url: this.configService.get<string>(
          'SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL',
        ),
        client_x509_cert_url: this.configService.get<string>(
          'SERVICE_ACCOUNT_CLIENT_X509_CERT_URL',
        ),
      };

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth,
      });

      console.log('[init] GoogleAuth OK');
    } catch (error) {
      console.error('[init] failed:', safeMsg(error));
      throw new InternalServerErrorException('Server authentication failed.');
    }
  }

  private async ensureInit() {
    if (!this.androidPublisher) {
      console.log(
        '[ensureInit] androidPublisher not ready. re-initializing...',
      );
      await this.init();
    }
  }

  async verifyProductPurchase(dto: VerifyProductDto, userId: string) {
    await this.ensureInit();
    const { packageName, productId, purchaseToken } = dto;
    console.log('[verifyProduct] start', {
      userId,
      packageName,
      productId,
      purchaseToken: mask(purchaseToken),
    });

    const coinAmount = COIN_PRICE[productId];
    if (!coinAmount) {
      console.error('[verifyProduct] unknown productId', productId);
      throw new BadRequestException(`Unknown productId: ${productId}`);
    }

    // 중복 처리
    const exists = await this.purchaseRepo.findOne({
      where: { purchaseToken },
    });
    if (exists) {
      console.log('[verifyProduct] already processed purchaseToken', {
        token: mask(purchaseToken),
        userId,
      });
      const user = await this.usersService.findOne(userId);
      return {
        success: true,
        message: '이미 처리된 결제입니다.',
        data: exists,
        coin: user.coin,
      };
    }

    // Google 검증
    let purchaseData: any;
    try {
      console.log('[verifyProduct] calling Google API...');
      const res = await this.androidPublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });
      purchaseData = res.data;
      console.log('[verifyProduct] Google API OK', {
        purchaseState: purchaseData?.purchaseState,
        orderId: purchaseData?.orderId,
      });
    } catch (err) {
      console.error('[verifyProduct] Google API failed', safeMsg(err));
      throw new BadRequestException('결제 토큰이 유효하지 않습니다.');
    }

    if (purchaseData?.purchaseState !== 0) {
      console.warn('[verifyProduct] purchase not completed', {
        state: purchaseData?.purchaseState,
      });
      return {
        success: false,
        message: '결제가 완료되지 않았거나 취소/보류 상태입니다.',
        data: purchaseData,
      };
    }

    // DB 저장
    try {
      const saved = await this.purchaseRepo.save(
        this.purchaseRepo.create({
          purchaseToken,
          userId,
          packageName,
          developerPayload: '',
        }),
      );
      console.log('[verifyProduct] DB save OK', { purchaseId: saved.id });

      // 코인 충전
      const chargeDto: CreateChargeDto = { amount: coinAmount };
      console.log('[verifyProduct] start charge', { coinAmount });
      const chargeDeal = await this.dealsService.chargeCoins(chargeDto, userId);
      const user = await this.usersService.findOne(userId);

      console.log('[verifyProduct] success', {
        userCoin: user.coin,
        dealId: chargeDeal?.id,
      });

      return {
        success: true,
        message: '결제 검증 및 코인 충전 완료',
        coin: user.coin,
        data: { purchase: saved, deal: chargeDeal },
      };
    } catch (err) {
      console.error('[verifyProduct] DB/charge failed', safeMsg(err));
      throw new InternalServerErrorException(
        '결제 처리 중 오류가 발생했습니다.',
      );
    }
  }

  async verifySubscriptionPurchase(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string,
  ) {
    await this.ensureInit();
    console.log('[verifySubscription] start', {
      packageName,
      subscriptionId,
      purchaseToken: mask(purchaseToken),
    });

    try {
      const res = await this.androidPublisher.purchases.subscriptionsv2.get({
        packageName,
        token: purchaseToken,
      });
      const sub = res.data;
      console.log('[verifySubscription] Google API OK', { state: sub.state });
      if (sub.state === 'ACTIVE') {
        return {
          success: true,
          message: '구독이 활성 상태입니다.',
          data: sub,
        };
      }
      return {
        success: false,
        message: '구독이 만료되었거나 비활성 상태입니다.',
        data: sub,
      };
    } catch (err) {
      console.error('[verifySubscription] Google API failed', safeMsg(err));
      throw new BadRequestException('구독 토큰이 유효하지 않습니다.');
    }
  }

  async getPurchaseLog(dto: VerifyProductDto) {
    await this.ensureInit();
    const { packageName, productId, purchaseToken } = dto;
    console.log('[debugLog] start', {
      packageName,
      productId,
      purchaseToken: mask(purchaseToken),
    });

    try {
      const res = await this.androidPublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });

      const data = res.data;
      const exists = await this.purchaseRepo.findOne({
        where: { purchaseToken },
      });

      console.log('[debugLog] Google OK', {
        state: data?.purchaseState,
        existsInDb: !!exists,
      });

      return {
        success: true,
        message: 'Google Play 결제 정보 조회 성공',
        db_processed: !!exists,
        google_status: data.purchaseState,
        google_data: data,
      };
    } catch (err) {
      console.error('[debugLog] Google API failed', safeMsg(err));
      const msg = err?.response?.data?.error?.message || err.message;
      return {
        success: false,
        message: `Google API 조회 실패: ${msg}`,
        db_processed: false,
        error_detail: msg,
      };
    }
  }
}

function mask(v?: string) {
  if (!v) return v;
  const s = String(v);
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

function safeMsg(e: any) {
  return {
    message: e?.message,
    code: e?.code,
    status: e?.response?.status,
    data: e?.response?.data?.error?.message ?? e?.response?.data,
  };
}
