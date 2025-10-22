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
  private androidPublisher: ReturnType<typeof google.androidpublisher> | null =
    null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    private readonly dealsService: DealsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    // 초기화 실패해도 서비스 자체는 살아있게 하고, 이후 ensureInit에서 재시도
    this.init().catch((e) =>
      console.error('[init] constructor failed:', safeMsg(e)),
    );
  }

  /** GoogleAuth + Android Publisher 생성 */
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

      this.androidPublisher = google.androidpublisher({ version: 'v3', auth });

      // 글로벌 옵션(요청 타임아웃은 각 호출에서 별도로도 설정)
      google.options({
        timeout: 7000,
        retry: false,
      });

      const projectId = credentials.project_id;
      console.log('[init] GoogleAuth OK (timeout=7s, retry=false)', {
        serviceAccount: clientEmail,
        projectId,
      });
    } catch (error) {
      console.error('[init] failed:', safeMsg(error));
      // 여기서 throw하면 서비스 주입 자체가 실패할 수 있으므로, 로그만 남기고 ensureInit에서 재시도
      this.androidPublisher = null;
    }
  }

  private async ensureInit() {
    if (!this.androidPublisher) {
      console.log(
        '[ensureInit] androidPublisher not ready. re-initializing...',
      );
      await this.init();
      if (!this.androidPublisher) {
        throw new InternalServerErrorException('Google 인증 초기화 실패');
      }
    }
  }

  /** 토큰 발급까지 사전 점검: 네트워크/권한/CA 문제를 여기서 먼저 잡아낸다 */
  private async assertGoogleAuthReady() {
    const auth = (this.androidPublisher as any)?._options?.auth as any;
    if (!auth)
      throw new InternalServerErrorException('GoogleAuth not initialized');

    try {
      const client = await auth.getClient();
      // gaxios는 per-request timeout 지원
      const token = await (client as any).getAccessToken({ timeout: 7000 });
      if (!token || !token.token) {
        throw new Error('Access token empty');
      }
      console.log('[auth] access token OK');
    } catch (e) {
      console.error('[auth] token fetch failed', safeMsg(e));
      throw new InternalServerErrorException(
        'Google 인증 실패(토큰 발급 실패)',
      );
    }
  }

  /** 일회성(코인) 인앱결제 검증 */
  async verifyProductPurchase(dto: VerifyProductDto, userId: string) {
    await this.ensureInit();
    await this.assertGoogleAuthReady();

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

    // 동일 토큰 중복 처리(Idempotency)
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

    // Google Play 검증
    console.log('[verifyProduct] calling Google API (products.get)...');
    let purchaseData: any;
    try {
      const res = await this.androidPublisher!.purchases.products.get(
        { packageName, productId, token: purchaseToken },
        { timeout: 7000 }, // per-request timeout
      );
      purchaseData = res.data;
      console.log('[verifyProduct] Google OK', {
        purchaseState: purchaseData?.purchaseState,
        orderId: purchaseData?.orderId,
        consumptionState: purchaseData?.consumptionState,
        acknowledgementState: purchaseData?.acknowledgementState,
      });
    } catch (err) {
      console.error('[verifyProduct] Google FAIL', safeMsg(err));
      throw new BadRequestException('결제 토큰 검증에 실패했습니다.');
    }

    // 0 = PURCHASED
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

    // (중요) 서버에서 승인(acknowledge) — 미승인 상태면 UX상 "처리중" 잔상 남는 경우 존재
    try {
      if (purchaseData?.acknowledgementState === 0) {
        await this.androidPublisher!.purchases.products.acknowledge(
          {
            packageName,
            productId,
            token: purchaseToken,
            requestBody: { developerPayload: userId || '' },
          },
          { timeout: 5000 },
        );
        console.log('[verifyProduct] acknowledge OK');
      } else {
        console.log('[verifyProduct] already acknowledged');
      }
    } catch (ackErr) {
      console.error('[verifyProduct] acknowledge FAIL', safeMsg(ackErr));
      throw new InternalServerErrorException('결제 승인(acknowledge) 실패');
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
    _subscriptionId: string, // v2에서는 token만 필요
    purchaseToken: string,
  ) {
    await this.ensureInit();
    await this.assertGoogleAuthReady();

    console.log('[verifySubscription] start', {
      packageName,
      purchaseToken: mask(purchaseToken),
    });

    try {
      const res = await this.androidPublisher!.purchases.subscriptionsv2.get(
        { packageName, token: purchaseToken },
        { timeout: 7000 },
      );

      const sub = res.data; // androidpublisher_v3.Schema$SubscriptionPurchaseV2
      console.log('[verifySubscription] Google API OK', {
        subscriptionState: sub.subscriptionState,
      });

      if (sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE') {
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

  /** 디버그 로그: 현재 토큰의 구글 상태 + DB 처리 여부 조회 */
  async getPurchaseLog(dto: VerifyProductDto) {
    await this.ensureInit();
    await this.assertGoogleAuthReady();

    const { packageName, productId, purchaseToken } = dto;
    console.log('[debugLog] start', {
      packageName,
      productId,
      purchaseToken: mask(purchaseToken),
    });

    try {
      const res = await this.androidPublisher!.purchases.products.get(
        { packageName, productId, token: purchaseToken },
        { timeout: 7000 },
      );
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
        google_status: data?.purchaseState,
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

/** 공통 유틸: 토큰 마스킹 */
function mask(v?: string) {
  if (!v) return v;
  const s = String(v);
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

/** 공통 유틸: 에러 로깅 간소화 */
function safeMsg(e: any) {
  return {
    message: e?.message,
    code: e?.code,
    status: e?.response?.status,
    data: e?.response?.data?.error?.message ?? e?.response?.data,
  };
}
