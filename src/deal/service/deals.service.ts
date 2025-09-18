import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DealsEntity } from '../entity/deals.entity';
import { CreateOldDealsDto } from '../dto/create-olddeals.dto';
import { DealsInterface } from '../interface/deals.interface';
import { ObjectId } from 'mongodb';
import { UpdateDealsDto } from '../dto/update-deals.dto';
import { CreateDealsDto } from '../dto/create-deals.dto';
import { BooksService } from 'src/books/service/book.service';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';
import { Type, Type as DealEntityType } from '../entity/deals.entity';
import { CreateChargeDto } from '../dto/create-charge.dto';
import { CreateToCashDto } from '../dto/create-tocash.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus } from '../entity/deals.entity';
import { UsersService } from 'src/users/service/users.service';
import { DealType, DealCondition } from '../dto/create-deals.dto';
import { compute } from 'googleapis/build/src/apis/compute';

type DealSummary =
  | (DealsInterface & {
      category: 'BOOK';
      bookType: 'NEW' | 'OLD';
      isExpired: boolean;
      bookStatus: string;
      isDownloaded: boolean;
    })
  | (DealsInterface & {
      category: 'COIN';
      // 책 관련 필드 없음
    });

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async createOld(
    dto: CreateOldDealsDto,
    userId: string,
  ): Promise<DealsInterface> {
    const userObjectId = new ObjectId(userId);
    const dealObjectId = new ObjectId(dto.dealId);

    //본인이 과거에 이 책을 구매한 이력이 있는지 여부
    const pastDeal = await this.userBookRepository.findOne({
      where: {
        userId: userObjectId,
        dealId: dealObjectId,
        book_status: 'MINE',
      },
    });

    if (!pastDeal) {
      throw new BadRequestException(
        '해당 도서를 구매한 이력이 없어 중고 등록이 불가능합니다',
      );
    }

    //Deal 조회해서 condition 확인(OWN이면 중고 등록 불가)
    const originalDeal = await this.dealsRepository.findOne({
      where: { dealId: dealObjectId },
    });
    let originalCondition: DealCondition = DealCondition.RENT; // 기본값 방어

    if (originalDeal && (originalDeal as any).condition) {
      const c = String((originalDeal as any).condition).toUpperCase();
      if (c === DealCondition.OWN) {
        throw new BadRequestException(
          '소장형(OWN) 도서는 중고로 등록할 수 없습니다',
        );
      }
      originalCondition =
        c === DealCondition.RENT ? DealCondition.RENT : DealCondition.RENT;
    }

    //등록 글 생성
    const deals = this.dealsRepository.create({
      ...dto,
      userId: userObjectId,
      sellerId: userObjectId.toHexString(),
      //registerId: new ObjectId(),
      dealId: new ObjectId(),
      sourceDealId: dealObjectId,
      registerDate: new Date(),
      bookId:
        typeof pastDeal.bookId === 'string'
          ? pastDeal.bookId
          : (pastDeal.bookId?.toHexString?.() ?? String(pastDeal.bookId ?? '')),

      title: pastDeal.title ?? null,
      author: pastDeal.author ?? null,
      image: pastDeal.image ?? null,
      type: Type.OLD,
      status: DealStatus.ACTIVE,
      condition: originalCondition,
    });

    const saved = await this.dealsRepository.save(deals);

    const userBook = await this.userBookRepository.findOne({
      where: {
        userId: userObjectId,
        dealId: dealObjectId,
      },
    });

    if (userBook) {
      userBook.book_status = 'SELLING' as any;

      // 누락된 정보 채워넣기
      userBook.title = pastDeal.title;
      userBook.author = pastDeal.author;
      userBook.image = pastDeal.image;

      await this.userBookRepository.save(userBook);
    }
    this.eventEmitter.emit('deal.registered', {
      bookId: saved.bookId?.toString?.() ?? String(saved.bookId),
      dealId: saved.dealId?.toHexString?.() ?? String(saved.dealId),
      sellerId:
        typeof saved.sellerId === 'string' ? saved.sellerId : saved.sellerId,
      type: 'OLD', // 중고 등록
      title: saved.title,
      author: saved.author,
      image: saved.image,
      price: saved.price,
    });
    return this.mapToInterface(saved);
  }

  async cancelRegister(
    dealId: string,
    userId: string,
  ): Promise<{ message: string }> {
    if (!ObjectId.isValid(dealId))
      throw new BadRequestException('Invalid dealId');
    if (!ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const dealObjectId = new ObjectId(dealId);
    const userObjectId = new ObjectId(userId);

    // 1) 취소 대상 deal
    const deal = await this.dealsRepository.findOne({
      where: { dealId: dealObjectId },
    });
    if (!deal) throw new NotFoundException(`Deal with id ${dealId} not found`);

    // 2) 소유자 검사
    const ownerObj =
      deal.userId instanceof ObjectId
        ? deal.userId
        : ObjectId.isValid(String(deal.userId))
          ? new ObjectId(String(deal.userId))
          : null;
    if (!ownerObj || !ownerObj.equals(userObjectId)) {
      throw new ForbiddenException('본인이 등록한 판매만 철회할 수 있습니다');
    }

    // 3) SELLING -> MINE 복구
    let restored = false;

    // 3-a) sourceDealId로 1차 복구 (ObjectId / string 둘 다 시도)
    const src =
      deal.sourceDealId instanceof ObjectId
        ? deal.sourceDealId
        : ObjectId.isValid(String(deal.sourceDealId))
          ? new ObjectId(String(deal.sourceDealId))
          : null;

    if (src) {
      const dealIdCandidates: ObjectId[] = [src];

      const candidates = await this.userBookRepository.find({
        where: {
          userId: userObjectId as any,
          dealId: In(dealIdCandidates), // ✅ FindOperator<ObjectId> 라서 타입 OK
        },
        order: { _id: 'DESC' as any },
      });
      for (const ub of candidates) {
        if ((ub as any).book_status === 'SELLING') {
          (ub as any).book_status = 'MINE';
          await this.userBookRepository.save(ub);
          restored = true;
          break;
        }
      }
    }

    // 3-b) 타이틀/저자 fallback
    if (!restored) {
      const fallback = await this.userBookRepository.findOne({
        where: {
          userId: userObjectId,
          book_status: 'SELLING' as any,
          title: deal.title ?? '',
          author: deal.author ?? null,
        },
        order: { _id: 'DESC' as any },
      });
      if (fallback) {
        (fallback as any).book_status = 'MINE';
        await this.userBookRepository.save(fallback);
        restored = true;
      }
    }

    // 4) deal 상태 기록 (아이돔포턴스)
    if (deal.status !== DealStatus.CANCELLED) {
      deal.status = DealStatus.CANCELLED;
      await this.dealsRepository.save(deal);
    }

    return {
      message: restored ? '판매 철회 완료' : '판매 철회 완료(복구 대상 없음)',
    };
  }

  async updateDeals(
    dealId: string,
    dto: UpdateDealsDto,
  ): Promise<DealsInterface> {
    const objectId = new ObjectId(dealId);
    const deal = await this.dealsRepository.findOneBy({ dealId: objectId });

    if (!deal) {
      throw new NotFoundException(`No deal found with bookId ${dealId}`);
    }
    Object.assign(deal, dto);

    await this.dealsRepository.save(deal);
    return this.mapToInterface(deal);
  }

  async findByRegisteredUserId(userId: string): Promise<DealsInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid UserId');
    }
    const objectId = new ObjectId(userId);
    const deals = await this.dealsRepository.find({
      where: { userId: objectId },
    });
    return deals.map((deal) => this.mapToInterface(deal));
  }

  async createDeals(dto: CreateDealsDto): Promise<DealsInterface> {
    const bookObjectId = new ObjectId(dto.bookId);

    if (!ObjectId.isValid(dto.bookId)) {
      throw new BadRequestException('Invalid bookId: must be 24-hex ObjectId');
    }

    if (dto.type === DealType.OLD && !ObjectId.isValid(String(dto.sellerId))) {
      throw new BadRequestException(
        'Invalid sellerId: must be 24-hex ObjectId for OLD deals',
      );
    }

    // 거래할 책 정보 조회
    const book = await this.booksService.findOne(bookObjectId.toHexString());
    if (!book) {
      throw new NotFoundException(`Book with id ${dto.bookId} not found`);
    }

    //거래 타입 변환
    const entityType =
      dto.type === DealType.OLD ? DealEntityType.OLD : DealEntityType.NEW;

    // 판매자 처리
    let sellerId: string | undefined = dto.sellerId;
    if (dto.type === DealType.NEW && !sellerId) {
      sellerId = 'SYSTEM';
    }
    if (dto.type === DealType.OLD && !sellerId) {
      throw new BadRequestException('중고 거래에는 sellerId가 필요합니다');
    }

    let computedPrice: number;
    let registerDateForRecord: Date;
    let conditionForRecord: DealCondition = DealCondition.RENT;

    // OLD면 반드시 기존 등록 매물이 존재해야 함
    let targetListing: DealsEntity | null = null;

    if (dto.type === DealType.OLD) {
      if (!dto.sellerId) {
        throw new BadRequestException('중고 거래에는 sellerId가 필요합니다');
      }

      // 등록된 매물(판매글) 찾기: 판매자 + 책 + 활성 상태
      targetListing = await this.dealsRepository.findOne({
        where: {
          type: DealEntityType.OLD,
          sellerId: dto.sellerId, // 문자열 기준
          bookId: dto.bookId, // 1단계: bookId로 정확 매칭
          status: DealStatus.ACTIVE, // 등록 상태(판매중)만
        },
        order: { registerDate: 'ASC' }, // 가장 먼저 등록된 것부터 잡고 싶다면
      });

      if (!targetListing) {
        // (bookId 누락 등 과거 데이터 대비용) 제목/판매자 fallback 매칭도 가능
        targetListing = await this.dealsRepository.findOne({
          where: {
            type: DealEntityType.OLD,
            sellerId: dto.sellerId,
            title: (await this.booksService.findOne(dto.bookId)).title,
            status: DealStatus.ACTIVE,
          },
          order: { registerDate: 'ASC' },
        });
      }

      if (!targetListing) {
        throw new BadRequestException(
          '해당 중고 매물이 존재하지 않거나 이미 거래되었습니다.',
        );
      }

      const tlc = String(
        targetListing.condition || DealCondition.RENT,
      ).toUpperCase();
      conditionForRecord =
        tlc === DealCondition.OWN ? DealCondition.OWN : DealCondition.RENT;

      computedPrice = Number(targetListing.price ?? 0);
      registerDateForRecord = (targetListing.registerDate as any) || new Date();
    } else {
      if (
        ![DealCondition.OWN, DealCondition.RENT].includes(dto.condition as any)
      ) {
        throw new BadRequestException('condition must be OWN or RENT');
      }
      conditionForRecord = dto.condition as DealCondition;

      sellerId = 'SYSTEM';
      if (book.price == null) {
        throw new BadRequestException('신규 도서 가격 정보가 없습니다');
      }
      computedPrice = Number(book.price);
      registerDateForRecord = new Date();
    }

    //거래 전, 구매자 현재 잔액 조회(UsersService가 computeCoin을 내부에서 호출)
    const buyer = await this.usersService.findOne(dto.buyerId!);
    const buyerBalance = Number(buyer.coin ?? 0);
    if (computedPrice > buyerBalance) {
      throw new BadRequestException(
        '잔액이 부족하여 거래를 진행할 수 없습니다',
      );
    }

    const deal = this.dealsRepository.create({
      dealId: new ObjectId(),
      //userId: new ObjectId(dto.buyerId), // 거래자 기준으로 설정
      buyerId: dto.buyerId,
      sellerId,
      bookId: dto.bookId,
      condition: conditionForRecord,
      price: computedPrice,
      type: entityType,
      dealDate: dto.dealDate || new Date().toISOString(),
      registerDate: registerDateForRecord,
      title: book.title,
      author: book.author,
      remainTime: book.total_time,
      publisher: book.publisher,
      image: book.book_pic,
      status: DealStatus.ACTIVE,
    });

    const insertResult = await this.dealsRepository.insert(deal);
    // const saved = await this.dealsRepository.findOneBy({
    //   _id: insertResult.identifiers[0]._id,
    // });
    const saved = await this.dealsRepository.save(deal);

    if (!saved) {
      throw new NotFoundException('Failed to find inserted deal');
    }

    //구매자 기준으로 MINE 상태의 UserBook 등록
    const buyerUserBook = this.userBookRepository.create({
      userId: new ObjectId(dto.buyerId),
      bookId: bookObjectId,
      dealId: saved.dealId,
      image: book.book_pic,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      remain_time: book.total_time,
      book_status: 'MINE' as any,
      condition: conditionForRecord,
    });

    await this.userBookRepository.save(buyerUserBook);

    this.eventEmitter.emit('deal.registered', {
      bookId: String(saved.bookId),
      dealId: saved.dealId?.toHexString?.() ?? String(saved.dealId),
      sellerId:
        typeof saved.sellerId === 'string' ? saved.sellerId : saved.sellerId,
      type: 'NEW',
      title: saved.title,
      author: saved.author,
      image: saved.image,
      price: saved.price,
    });

    return this.mapToInterface(saved);
  }

  async findDoneByUserId(userId: string): Promise<DealSummary[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const objectId = new ObjectId(userId);

    // 1) 책 기반 거리
    const userBooks = await this.userBookRepository.find({
      where: { userId: objectId },
    });

    const results: DealSummary[] = [];

    for (const userBook of userBooks) {
      const deal = await this.dealsRepository.findOne({
        where: { dealId: userBook.dealId },
      });

      if (!deal) continue;

      results.push({
        ...this.mapToInterface(deal),
        category: 'BOOK',
        bookType: deal.type === 'OLD' ? 'OLD' : 'NEW',
        isExpired: userBook.remain_time === 0,
        bookStatus: userBook.book_status,
        isDownloaded: Boolean(userBook.isDownloaded),
      });
    }

    // 2) 코인 거래(충전/현금전환) 추가

    const coinDeals = await this.dealsRepository.find({
      where: {
        userId: objectId,
        //type: In([Type.CHARGE, Type.TOCASH]),
      },
      order: { dealDate: 'DESC' },
    });

    for (const d of coinDeals) {
      if (d.type === Type.NEWREFUND) {
        results.push({
          ...this.mapToInterface(d),
          category: 'BOOK',
          bookType: 'NEW', // 환불은 NEW만 허용
          isExpired: false, // 환불 시 보유 취소되므로 만료 개념상 false
          bookStatus: 'MINE', // 보유 중 기준 라벨
          isDownloaded: false, // 다운로드 전만 환불 가능
        });
      } else {
        results.push({
          ...this.mapToInterface(d),
          category: 'COIN',
        });
      }
    }

    //전체 정렬(거래 시각 기준 내림차순)
    results.sort((a, b) => {
      const at = new Date(a.dealDate ?? 0).getTime();
      const bt = new Date(b.dealDate ?? 0).getTime();
      return bt - at;
    });

    return results;
  }

  //코인 충전
  async chargeCoins(
    dto: CreateChargeDto,
    userId: string,
  ): Promise<DealsInterface> {
    const deal = this.dealsRepository.create({
      dealId: new ObjectId(),
      userId: new ObjectId(userId),
      type: Type.CHARGE,
      price: dto.amount,
      dealDate: dto.dealDate || new Date().toISOString(),
    });

    const insertResult = await this.dealsRepository.insert(deal);
    const saved = await this.dealsRepository.findOneBy({
      _id: insertResult.identifiers[0]._id,
    });

    if (!saved)
      throw new NotFoundException('Failed to find inserted charge deal');
    return this.mapToInterface(saved);
  }

  //코인 현금전환
  async coinToCash(
    dto: CreateToCashDto,
    userId: string,
  ): Promise<DealsInterface> {
    const deal = this.dealsRepository.create({
      dealId: new ObjectId(),
      userId: new ObjectId(userId),
      type: Type.TOCASH,
      price: dto.amount,
      dealDate: dto.dealDate || new Date().toISOString(),
    });

    const insertResult = await this.dealsRepository.insert(deal);
    const saved = await this.dealsRepository.findOneBy({
      _id: insertResult.identifiers[0]._id,
    });

    if (!saved)
      throw new NotFoundException('Failed to find inserted cashout deal');
    return this.mapToInterface(saved);
  }

  // 환불
  async refund(dealId: string, userId: string, reason?: string) {
    if (!ObjectId.isValid(dealId))
      throw new BadRequestException('Invalid dealId');
    if (!ObjectId.isValid(userId))
      throw new BadRequestException('Invalid userId');

    const dealObjectId = new ObjectId(dealId);
    const userObjectId = new ObjectId(userId);

    //1) 원 거래 조회
    const deal = await this.dealsRepository.findOne({
      where: { dealId: dealObjectId },
    });
    if (!deal) throw new NotFoundException(`Deal with id ${dealId} not found`);

    //소유 확인
    const buyerIdStr = String(deal.buyerId ?? '');
    if (buyerIdStr !== userId) {
      throw new ForbiddenException('본인이 구매한 거래만 환불할 수 있습니다');
    }

    //이미 취소/완료된 이중 환불 방지
    if (deal.status !== DealStatus.ACTIVE) {
      throw new BadRequestException('이미 처리된 거래입니다');
    }

    //2) UserBook 찾기(해당 거래로 생성된 보유도서)
    const userBook = await this.userBookRepository.findOne({
      where: { userId: userObjectId, dealId: deal.dealId },
    });

    if (!userBook) {
      throw new BadRequestException('환불 대상 보유 도서를 찾을 수 없습니다');
    }

    //3)다운로드 여부 체크
    if (userBook.isDownloaded) {
      throw new BadRequestException(
        '이미 다운로드한 도서는 환불할 수 없습니다',
      );
    }

    //4) 코인 환급

    const refundAmount = Number(deal.price ?? 0);

    //5) 거래상태 업데이트(거래 취소)
    deal.status = DealStatus.CANCELLED;
    await this.dealsRepository.save(deal);

    //6) REFUND 거래 기록(거래내역 노출용, COIN 카테고리로 자동 분류됨)
    const refundRecord = this.dealsRepository.create({
      dealId: new ObjectId(),
      userId: userObjectId,
      type: Type.NEWREFUND,
      category: 'BOOK' as any,
      price: refundAmount,
      dealDate: new Date().toISOString(),
      title: deal.title,
      author: deal.author,
      image: deal.image,
      publisher: deal.publisher,
      status: DealStatus.COMPLETED,
      //환불이유 저장하고싶으면 DealsEntity에 nullable string 컬럼 하나 추가하기
    });
    await this.dealsRepository.save(refundRecord);

    //7) user book 삭제(다운로드 안했으므로 보유 취소)
    await this.userBookRepository.delete({ _id: userBook._id });

    return { message: '환불이 완료되었습니다', refundAmount };
  }

  private mapToInterface(entity: DealsEntity): DealsInterface {
    return {
      id: entity._id.toHexString() || '',
      //registerId: entity.registerId?.toHexString() || '',
      dealId: entity.dealId?.toHexString() || '',
      //userId: entity.userId.toHexString() || '',
      type: entity.type,
      category: entity.category,
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      bookId: entity.bookId,
      price: entity.price,
      title: entity.title,
      author: entity.author,
      remainTime: entity.remainTime,
      condition: entity.condition,
      buyerBookId: entity.buyerBookId,
      sellerBookId: entity.sellerBookId,
      dealDate: entity.dealDate,
      registerDate: entity.registerDate,
      image: entity.image,
      publisher: entity.publisher,
      sourceDealId:
        entity.sourceDealId?.toHexString?.() ??
        String(entity.sourceDealId ?? ''),
    };
  }
}
