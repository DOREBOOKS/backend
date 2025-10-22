// purchase.service.ts
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { androidpublisher_v3, google } from 'googleapis';
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
  private androidPublisher: androidpublisher_v3.Androidpublisher;

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
        rootUrl: 'https://androidpublisher.googleapis.com/',
      });

      // 전역 타임아웃/재시도 설정
      google.options({
        timeout: 30000,
        retry: false,
        http2: false,
      });

      console.log('[init] GoogleAuth OK');

      const client = await auth.getClient(); // 인증 객체 생성 검증
      const token = await client.getAccessToken(); // 토큰 발급 가능 여부 검증
      console.log('[init] access token ready:', !!token);
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

    const exists = await this.purchaseRepo.findOne({
      where: { purchaseToken },
    });
    if (exists) {
      console.log('[verifyProduct] duplicate token, returning cached result', {
        purchaseId: exists.id,
      });
      const user = await this.usersService.findOne(userId);
      return {
        success: true,
        message: '이미 처리된 결제입니다.',
        data: exists,
        coin: user.coin,
      };
    }

    // Google 검증 (AbortController로 하드 타임아웃)
    let purchaseData: androidpublisher_v3.Schema$ProductPurchase;
    console.log('[verifyProduct] calling Google API...');
    const controller = new AbortController();
    const timer = setTimeout(() => {
      console.error('[verifyProduct] Google API TIMEOUT -> aborting request');
      controller.abort();
    }, 60000);

    try {
      console.log('왜 안돼ㅠㅠㅠㅠ', productId, packageName, purchaseToken);
      const res = await this.androidPublisher.purchases.products.get(
        {
          packageName,
          productId,
          token: purchaseToken,
        },
        { signal: controller.signal, timeout: 30000, retry: false },
      );
      console.log('왜 안돼ㅠㅠㅠㅠ1');
      clearTimeout(timer);
      purchaseData = res.data;
      console.log(purchaseData, 'purchaseData');
      console.log('[verifyProduct] Google OK', {
        purchaseState: purchaseData?.purchaseState,
        orderId: purchaseData?.orderId,
        consumptionState: purchaseData?.consumptionState,
        acknowledgementState: purchaseData?.acknowledgementState,
      });
    } catch (err) {
      clearTimeout(timer);
      console.error('[verifyProduct] Google FAIL', safeMsg(err));
      throw new BadRequestException('결제 토큰이 유효하지 않습니다.');
    }

    if (purchaseData?.purchaseState !== 0) {
      console.warn('[verifyProduct] not PURCHASED', {
        state: purchaseData?.purchaseState,
      });
      return {
        success: false,
        message: '결제가 완료되지 않았거나 취소/보류 상태입니다.',
        data: purchaseData,
      };
    }

    // DB 저장
    let saved: Purchase | null = null;
    try {
      console.log('[verifyProduct] DB save start');
      saved = await this.purchaseRepo.save(
        this.purchaseRepo.create({
          purchaseToken,
          userId,
          packageName,
          developerPayload: '',
        }),
      );
      console.log('[verifyProduct] DB save OK', { purchaseId: saved.id });
    } catch (dbErr: any) {
      console.error('[verifyProduct] DB save FAIL', safeMsg(dbErr));
      const again = await this.purchaseRepo.findOne({
        where: { purchaseToken },
      });
      if (again) {
        console.warn('[verifyProduct] DB unique race recovered', {
          purchaseId: again.id,
        });
        saved = again;
      } else {
        throw new InternalServerErrorException('구매 저장에 실패했습니다.');
      }
    }

    // 코인 충전
    try {
      const before = await this.usersService.findOne(userId);
      console.log('[verifyProduct] charge start', {
        coinAmount,
        beforeCoin: before?.coin,
      });

      const chargeDto: CreateChargeDto = { amount: coinAmount };
      const chargeDeal = await this.dealsService.chargeCoins(chargeDto, userId);

      const after = await this.usersService.findOne(userId);
      console.log('[verifyProduct] charge OK', {
        dealId: chargeDeal?.id,
        afterCoin: after?.coin,
      });

      return {
        success: true,
        message: '결제 검증 및 코인 충전 완료',
        coin: after.coin,
        data: { purchase: saved, deal: chargeDeal },
      };
    } catch (chargeErr) {
      console.error('[verifyProduct] charge FAIL', safeMsg(chargeErr));
      throw new InternalServerErrorException('코인 충전에 실패했습니다.');
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
      const controller = new AbortController();
      const timer = setTimeout(() => {
        console.error('[verifySubscription] Google API TIMEOUT -> aborting');
        controller.abort();
      }, 30000);

      const res = await this.androidPublisher.purchases.subscriptionsv2.get(
        { packageName, token: purchaseToken },
        { signal: controller.signal },
      );

      clearTimeout(timer);
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
      const controller = new AbortController();
      const timer = setTimeout(() => {
        console.error('[debugLog] Google API TIMEOUT -> aborting');
        controller.abort();
      }, 30000);

      const res = await this.androidPublisher.purchases.products.get(
        { packageName, productId, token: purchaseToken },
        { signal: controller.signal },
      );

      clearTimeout(timer);
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
