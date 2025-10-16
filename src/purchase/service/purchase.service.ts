import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from '../entities/purchase.entity';
import { VerifyProductDto } from '../dto/verify-product.dto';
import { COIN_PRICE } from '../constants/coin_price';
import { Verify } from 'crypto';
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
    this.init();
  }

  private async init() {
    try {
      // 1. 서비스 계정 키 파일 경로 설정 (환경 변수 사용 권장)
      const keyFilePath = this.configService.get<string>(
        'SERVICE_ACCOUNT_KEY_PATH',
      );

      if (!keyFilePath) {
        throw new Error(
          'SERVICE_ACCOUNT_KEY_PATH 환경 변수가 설정되지 않았습니다.',
        );
      }

      const keyFile = path.join(process.cwd(), keyFilePath);

      // 2. JWT 클라이언트 생성 (인증을 위해 사용)
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: auth,
      });
    } catch (error) {
      console.error('Google API 인증 실패:', error);
      throw new InternalServerErrorException('Server authentication failed.');
    }
  }

  /**
   * 안드로이드 인앱 결제(단일 아이템)를 검증합니다.
   * @param packageName - 앱 패키지 이름 (예: com.yourcompany.yourapp)
   * @param productId - 구매한 아이템의 상품 ID
   * @param purchaseToken - 안드로이드 앱에서 받은 구매 토큰
   */
  async verifyProductPurchase(dto: VerifyProductDto) {
    const { packageName, productId, purchaseToken, userId } = dto;

    //초기화
    if (!this.androidPublisher) {
      await this.init();
    }

    //0)SKU->코인양 결정
    const coinAmount = COIN_PRICE[productId];
    if (!coinAmount) {
      throw new BadRequestException(`Unknown productId:${productId}`);
    }

    //1) 중복 처리 체크
    const exists = await this.purchaseRepo.findOne({
      where: { purchaseToken },
    });
    if (exists) {
      const user = await this.usersService.findOne(userId);
      return {
        success: true,
        message: '이미 처리된 결제입니다.',
        data: exists,
        coin: user.coin,
      };
    }

    //2)구글 검증
    let purchaseData: any;
    try {
      const response = await this.androidPublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });

      purchaseData = response.data;

      // //3) 결제 상태 확인 (0: PURCHASED, 1: PENDING, 2: CANCELLED/REFUNDED)
      // if (purchaseData.purchaseState === 0) {
      //   // 이 결제가 이미 처리되었는지 확인하는 로직 추가
      //   // (예: 데이터베이스에 purchaseToken이 이미 있는지 확인)

      //   // 결제가 아직 처리되지 않았다면, 아이템 지급 로직 실행
      //   // (예: DB에 사용자 아이템 수량 증가, 결제 기록 저장)
      //   return {
      //     success: true,
      //     message: '결제 검증 및 처리 성공',
      //     data: purchaseData,
      //   };
      // } else {
      //   return {
      //     success: false,
      //     message: '결제가 완료되지 않았거나 취소되었습니다.',
      //     data: purchaseData,
      //   };
      // }
    } catch (error) {
      console.error('결제 검증 오류:', error.message);
      throw new BadRequestException('결제 토큰이 유효하지 않습니다.');
    }

    //3) 상태 확인(0:PURCHASED)
    if (purchaseData.purchaseState !== 0) {
      return {
        success: false,
        message: '결제가 완료되지 않았거나 취소/보류 상태입니다',
        data: purchaseData,
      };
    }

    //4) Acknowledge 먼저 시도
    // try {
    //   await this.androidPublisher.purchases.products.acknowledge({
    //     packageName,
    //     productId,
    //     token: purchaseToken,
    //     requestBody: { developerPayload: 'ack-from-server' },
    //   });
    // } catch (ackErr) {
    //   console.warn('acknowledge 실패', ackErr?.message || ackErr);
    // }

    //5) Purchase 저장(중복 방지)
    const savedPurcahse = await this.purchaseRepo.save(
      this.purchaseRepo.create({
        purchaseToken,
        userId,
        packageName,
        developerPayload: '',
      }),
    );

    //6) Deals에 코인 충전 기록 생성(Type.CHARGE)
    const chargeDto: CreateChargeDto = {
      amount: coinAmount,
      //dealDate: new Date().toISOString(),
    };
    const chargeDeal = await this.dealsService.chargeCoins(chargeDto, userId);
    const user = await this.usersService.findOne(userId);

    return {
      success: true,
      message: '결제 검증 및 코인 충전 완료',
      coin: user.coin,
      data: { purchase: savedPurcahse, deal: chargeDeal },
    };
  }
  /**
   * 안드로이드 인앱 결제(구독)를 검증합니다.
   * @param packageName - 앱 패키지 이름
   * @param subscriptionId - 구독 상품 ID
   * @param purchaseToken - 구독 구매 토큰
   */
  async verifySubscriptionPurchase(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string,
  ) {
    try {
      const response =
        await this.androidPublisher.purchases.subscriptionsv2.get({
          packageName: packageName,
          token: purchaseToken,
        });

      const subscriptionData = response.data;

      // 구독 상태 확인
      if (subscriptionData.state === 'ACTIVE') {
        // 구독이 활성 상태일 때 처리
        return {
          success: true,
          message: '구독이 활성 상태입니다.',
          data: subscriptionData,
        };
      } else {
        return {
          success: false,
          message: '구독이 만료되었거나 비활성 상태입니다.',
          data: subscriptionData,
        };
      }
    } catch (error) {
      console.error('구독 검증 오류:', error.message);
      throw new BadRequestException('구독 토큰이 유효하지 않습니다.');
    }
  }
}
