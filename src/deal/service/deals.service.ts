import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MongoRepository, Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
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
import { DealCategory } from '../entity/deals.entity';
import { MailService } from 'src/mail/service/mail.service';

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

type CashoutSummary = {
  id: string;
  userId: string;
  amount: number;
  status: DealStatus;
  dealDate?: Date | string;
  bank?: string;
  bankAccount?: string;
  requestedAt?: Date | string;
};

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: MongoRepository<DealsEntity>,
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  private async overlayBookMeta<T extends { bookId?: any }>(rows: T[]) {
    const ids = Array.from(
      new Set(
        rows
          .map((r) =>
            typeof r.bookId === 'string'
              ? r.bookId
              : (r.bookId?.toHexString?.() ?? String(r.bookId ?? '')),
          )
          .filter(Boolean) as string[],
      ),
    );
    const bookMap = await this.booksService.findManyByIds(ids);
    for (const r of rows as any[]) {
      const bid =
        typeof r.bookId === 'string'
          ? r.bookId
          : (r.bookId?.toHexString?.() ?? String(r.bookId ?? ''));
      const b = bid ? bookMap.get(bid) : undefined;
      if (b) {
        r.title = b.title;
        r.author = b.author;
        r.publisher = b.publisher;
        r.bookPic = (b as any).bookPic;
        // r.originalPriceRent ??= b.priceRent;
        // r.originalPriceOwn ??= b.priceOwn;
        r.remainTime ??= (b as any).totalTime * 60;
        (r as any).totalTime = (b as any).totalTime;
      }
    }
    return rows;
  }

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
      where: { _id: dealObjectId },
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

    //양도 횟수 체크
    const remainTransferCount = Number(
      (pastDeal as any).remainTransferCount ?? 0,
    );
    if (originalCondition === DealCondition.RENT && remainTransferCount <= 0) {
      throw new BadRequestException(
        '양도 가능 횟수를 모두 사용하여 중고 등록이 불가능합니다',
      );
    }

    const bookIdForMeta =
      typeof pastDeal.bookId === 'string'
        ? pastDeal.bookId
        : (pastDeal.bookId?.toHexString?.() ?? String(pastDeal.bookId ?? ''));

    const book = await this.booksService.findOne(bookIdForMeta);
    const publisherIdForRecord: ObjectId = book.publisherId;

    const userBook = pastDeal;
    (userBook as any).book_status = 'SELLING';
    await this.userBookRepository.save(userBook);

    let remainSeconds: number | undefined = undefined;
    if (typeof (userBook as any)?.remainTime === 'number') {
      remainSeconds = (userBook as any).remainTime;
    }

    //등록 글 생성
    const deals = this.dealsRepository.create({
      ...dto,
      buyerId: null,
      sellerId: userObjectId,
      _id: new ObjectId(),
      sourceDealId: dealObjectId,
      registerDate: new Date(),
      bookId: bookIdForMeta,
      type: Type.OLD,
      status: DealStatus.LISTING,
      condition: originalCondition,
      goodPoints: dto.goodPoints ?? [],
      comment: dto.comment?.trim()?.slice(0, 100) ?? undefined,
      remainTime: remainSeconds,
      publisherId: publisherIdForRecord,
      category: DealCategory.BOOK,
    });

    const saved = await this.dealsRepository.save(deals);
    const remainMinutes =
      typeof saved.remainTime === 'number'
        ? Math.max(0, Math.floor(saved.remainTime / 60))
        : undefined;

    try {
      const b = await this.booksService.findOne(bookIdForMeta);
      this.eventEmitter.emit('deal.registered', {
        bookId: String(saved.bookId),
        dealId: saved._id.toHexString(),
        sellerId: (saved.sellerId as ObjectId).toHexString(),
        type: 'OLD',
        title: b.title,
        author: b.author,
        image: (b as any).bookPic,
        price: saved.price,
        remainTime: remainMinutes,
      });
    } catch {
      // 메타 조회 실패해도 이벤트는 최소 정보로
      this.eventEmitter.emit('deal.registered', {
        bookId: String(saved.bookId),
        dealId: saved._id.toHexString(),
        sellerId: (saved.sellerId as ObjectId).toHexString(),
        type: 'OLD',
        price: saved.price,
        remainTime: remainMinutes,
      });
    }

    const [overlay] = await this.overlayBookMeta([saved]);
    return this.mapToInterface(overlay as any);
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
      where: { _id: dealObjectId },
    });
    if (!deal) throw new NotFoundException(`Deal with id ${dealId} not found`);

    let sellerObj: ObjectId | null = null;

    if (deal.sellerId instanceof ObjectId) {
      sellerObj = deal.sellerId;
    } else if (
      typeof deal.sellerId === 'string' &&
      ObjectId.isValid(deal.sellerId)
    ) {
      sellerObj = new ObjectId(deal.sellerId);
    } else {
      // NEW 거래나 잘못된 데이터일 수 있음
      throw new BadRequestException('등록글의 sellerId가 유효하지 않습니다');
    }

    if (!sellerObj.equals(userObjectId)) {
      throw new ForbiddenException('본인이 등록한 판매만 철회할 수 있습니다');
    }
    // 3) SELLING -> MINE 복구
    let restored = false;

    // 3-a) sourceDealId로 1차 복구 (ObjectId / string 둘 다 시도)
    const src =
      deal.sourceDealId instanceof ObjectId
        ? deal.sourceDealId
        : typeof deal.sourceDealId === 'string' &&
            ObjectId.isValid(deal.sourceDealId)
          ? new ObjectId(deal.sourceDealId)
          : null;

    if (src) {
      const dealIdCandidates: ObjectId[] = [src];

      const candidates = await this.userBookRepository.find({
        where: {
          userId: userObjectId as any,
          dealId: In(dealIdCandidates),
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
          //title: deal.title ?? '',
          //author: deal.author ?? null,
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
    userId: string,
    dto: UpdateDealsDto,
  ): Promise<DealsInterface> {
    if (!ObjectId.isValid(dealId)) {
      throw new BadRequestException('Invalid dealId');
    }
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const objectId = new ObjectId(dealId);
    const sellerObjectId = new ObjectId(userId);

    // 1) 등록글(OLD + LISTING + 본인 sellerId)만 찾기
    let deal = await this.dealsRepository.findOne({
      where: {
        _id: objectId,
        type: Type.OLD,
        status: DealStatus.LISTING,
        sellerId: sellerObjectId,
      },
    });

    // 혹시 프론트에서 원본 dealId를 넘기는 경우를 위해 sourceDealId fallback
    if (!deal) {
      deal = await this.dealsRepository.findOne({
        where: {
          sourceDealId: objectId,
          type: Type.OLD,
          status: DealStatus.LISTING,
          sellerId: sellerObjectId,
        },
        order: { registerDate: 'DESC' as any },
      });
    }

    if (!deal) {
      throw new NotFoundException('수정 가능한 판매 등록글이 없습니다');
    }

    // 2) 수정 가능한 필드만 반영
    const { price, goodPoints, comment } = dto as any;

    Object.assign(deal, {
      ...(price !== undefined && { price }),
      ...(goodPoints !== undefined && { goodPoints }),
      ...(comment !== undefined && {
        comment: String(comment).trim().slice(0, 100),
      }),

      buyerId: null, // 등록글은 buyerId 없음
      sellerId: deal.sellerId, // sellerId 안전하게 유지
    });

    await this.dealsRepository.save(deal);
    return this.mapToInterface(deal);
  }

  async findByRegisteredUserId(userId: string): Promise<DealsInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid UserId');
    }
    const objectId = new ObjectId(userId);
    const deals = await this.dealsRepository.find({
      where: {
        sellerId: objectId,
        type: DealEntityType.OLD,
        status: DealStatus.LISTING,
      },
      order: { registerDate: 'DESC' as any },
    });
    const enriched = await this.overlayBookMeta(deals as any[]);

    return enriched.map((deal) => this.mapToInterface(deal as any));
  }

  async createDeals(
    dto: CreateDealsDto,
    buyerId: string,
  ): Promise<DealsInterface> {
    if (!ObjectId.isValid(buyerId)) {
      throw new BadRequestException('Invalid buyerId');
    }
    const buyerObjectId = new ObjectId(buyerId);

    const entityType = dto.type === DealType.OLD ? Type.OLD : Type.NEW;

    // 최종 기록에 들어갈 공통 필드
    let bookId!: string;
    let sellerObjectId: ObjectId | undefined;
    let computedPrice!: number;
    let conditionForRecord!: DealCondition;
    let registerDateForRecord: Date = new Date();
    let title = '';
    let author = '';
    let publisher = '';
    let bookPic = '';
    let remainTime: number | undefined;
    let totalSeconds: number | undefined;

    let buyerRemainTransferCount = 0;

    let listingForOld: DealsEntity | null = null; // 등록글 캐시
    let sellerUserBookForOld: UserBooksEntity | null = null; // 판매자 user_books 캐시
    let bookMetaForOld: any | null = null;

    let publisherIdForRecord: ObjectId | undefined;

    if (dto.type === DealType.OLD) {
      // OLD: dealId 기반으로 "등록글"을 직접 선점
      if (!dto.dealId || !ObjectId.isValid(dto.dealId)) {
        throw new BadRequestException(
          'dealId is required for OLD and must be a valid ObjectId',
        );
      }
      const listingId = new ObjectId(dto.dealId);

      // 1) 선점(PROCESSING) 시도 (idempotent: 내가 이미 선점했으면 통과)
      const claimRes = await this.dealsRepository.updateOne(
        {
          _id: listingId,
          type: Type.OLD,
          $or: [
            { status: DealStatus.LISTING },
            { status: DealStatus.PROCESSING, reservedBy: buyerObjectId },
          ],
        },
        {
          $set: {
            status: DealStatus.PROCESSING,
            reservedBy: buyerObjectId,
            reservedAt: new Date(),
          },
        },
      );

      if (claimRes.matchedCount === 0) {
        const exists = await this.dealsRepository.findOne({
          where: { _id: listingId as any },
        });
        if (!exists) throw new BadRequestException('매물이 존재하지 않습니다');
        if (exists.status === DealStatus.COMPLETED) {
          throw new BadRequestException('이미 거래 완료된 매물입니다');
        }
        if (
          exists.status === DealStatus.PROCESSING &&
          ((exists.reservedBy as any)?.toHexString?.() ??
            String(exists.reservedBy)) !== buyerObjectId.toHexString()
        ) {
          throw new BadRequestException('다른 구매자가 선점한 매물입니다');
        }
        throw new BadRequestException(
          '해당 중고 매물이 없거나 이미 거래되었습니다',
        );
      }

      // 2) 최신 문서 재조회
      listingForOld = await this.dealsRepository.findOneBy({ _id: listingId });
      const listing = listingForOld;
      if (!listing) throw new BadRequestException('매물 조회 실패');

      if (listing.publisherId) {
        publisherIdForRecord = listing.publisherId;
      }

      // 3) 본인 매물 방지 (롤백 포함)
      if (
        (listing.sellerId as any)?.toHexString?.() ===
        buyerObjectId.toHexString()
      ) {
        await this.dealsRepository.updateOne(
          {
            _id: listingId,
            status: DealStatus.PROCESSING,
            reservedBy: buyerObjectId,
          },
          {
            $set: { status: DealStatus.LISTING },
            $unset: { reservedBy: '', reservedAt: '' },
          },
        );
        throw new BadRequestException('본인 등록글은 구매할 수 없습니다');
      }

      // 양도 1회 제한 검사
      // 공통으로 쓸 sellerId / sourceDealId
      const sellerIdFromListing =
        listing.sellerId instanceof ObjectId
          ? listing.sellerId
          : new ObjectId(String(listing.sellerId));

      const sourceDealId =
        listing.sourceDealId instanceof ObjectId
          ? listing.sourceDealId
          : new ObjectId(String(listing.sourceDealId));

      // 판매자 user_books 한 번만 조회해서 캐시
      sellerUserBookForOld = await this.userBookRepository.findOne({
        where: {
          userId: sellerIdFromListing,
          dealId: sourceDealId,
        },
      });

      const sellerRemainTransferCount = Number(
        (sellerUserBookForOld as any)?.remainTransferCount ?? 0,
      );
      const sellerDepth = Number(
        (sellerUserBookForOld as any)?.transferDepth ?? 0,
      );
      const sellerCondition = String(
        (sellerUserBookForOld as any)?.condition ?? 'RENT',
      ).toUpperCase();

      if (sellerCondition === DealCondition.RENT && sellerDepth >= 1) {
        // 선점 롤백
        await this.dealsRepository.updateOne(
          {
            _id: listingId,
            status: DealStatus.PROCESSING,
            reservedBy: buyerObjectId,
          },
          {
            $set: { status: DealStatus.LISTING },
            $unset: { reservedBy: '', reservedAt: '' },
          },
        );
        throw new BadRequestException(
          '이미 1회 양도된 도서이므로 거래를 완료할 수 없습니다',
        );
      }

      sellerObjectId = sellerIdFromListing;
      bookId = listing.bookId;
      computedPrice = Number(listing.price ?? 0);
      conditionForRecord =
        String(listing.condition ?? DealCondition.RENT).toUpperCase() ===
        DealCondition.OWN
          ? DealCondition.OWN
          : DealCondition.RENT;
      registerDateForRecord = listing.registerDate ?? new Date();

      try {
        bookMetaForOld = await this.booksService.findOne(bookId);
      } catch {
        bookMetaForOld = null;
      }

      if (!publisherIdForRecord && bookMetaForOld) {
        publisherIdForRecord = bookMetaForOld.publisherId;
      }

      // remainTime 계산 (sellerUserBook → listing.remainTime → bookMeta 순서로 fallback)
      const sellerRemain = (sellerUserBookForOld as any)?.remainTime;

      if (typeof sellerRemain === 'number') {
        remainTime = sellerRemain; // 초
      } else if (typeof (listing as any)?.remainTime === 'number') {
        remainTime = (listing as any).remainTime; // 초
      } else if (
        bookMetaForOld &&
        typeof (bookMetaForOld as any)?.totalTime === 'number'
      ) {
        remainTime = Number((bookMetaForOld as any).totalTime) * 60; // 분 → 초
      } else {
        remainTime = undefined;
      }
    } else {
      // NEW: bookId + condition 필요
      if (!dto.bookId || !ObjectId.isValid(dto.bookId)) {
        throw new BadRequestException(
          'Invalid bookId: must be 24-hex ObjectId',
        );
      }
      if (
        !dto.condition ||
        ![DealCondition.OWN, DealCondition.RENT].includes(dto.condition)
      ) {
        throw new BadRequestException(
          'condition must be OWN or RENT for NEW deals',
        );
      }

      const book = await this.booksService.findOne(dto.bookId);
      if (!book) {
        throw new NotFoundException(`Book with id ${dto.bookId} not found`);
      }

      bookId = dto.bookId;
      conditionForRecord = dto.condition;

      publisherIdForRecord = book.publisherId;
      // 가격 산정은 서비스 정책에 맞게 (예: 대여/소장 별도)
      const b = book as any;
      computedPrice =
        dto.condition === DealCondition.RENT
          ? Number(b.priceRent ?? b.price ?? 0)
          : Number(b.priceOwn ?? b.price ?? 0);

      const maxTransferCountFromBook = Number(
        (book as any).maxTransferCount ?? 0,
      );

      title = book.title;
      author = book.author;
      publisher = book.publisher;
      bookPic = book.bookPic;
      remainTime = book.totalTime * 60;
      totalSeconds = book.totalTime * 60;

      buyerRemainTransferCount = maxTransferCountFromBook;
    }

    // 잔액 체크
    const buyer = await this.usersService.findOne(buyerId);
    const buyerBalance = Number((buyer as any).coin ?? 0);
    if (computedPrice > buyerBalance) {
      // OLD 선점 롤백 (선점 상태인 경우만)
      if (dto.type === DealType.OLD) {
        await this.dealsRepository.updateOne(
          {
            _id: new ObjectId(dto.dealId!),
            status: DealStatus.PROCESSING,
            reservedBy: buyerObjectId,
          },
          {
            $set: { status: DealStatus.LISTING },
            $unset: { reservedBy: '', reservedAt: '' },
          },
        );
      }
      throw new BadRequestException(
        '잔액이 부족하여 거래를 진행할 수 없습니다',
      );
    }

    // 거래 레코드 생성(구매 확정 기록)
    const saved = await this.dealsRepository.save(
      this.dealsRepository.create({
        _id: new ObjectId(),
        buyerId: buyerObjectId,
        sellerId: sellerObjectId,
        bookId,
        condition: conditionForRecord,
        price: computedPrice,
        type: entityType,
        registerDate: registerDateForRecord,

        status: DealStatus.COMPLETED,
        category: DealCategory.BOOK,
        dealDate: new Date(),
        publisherId: publisherIdForRecord,
      }),
    );

    // OLD이면 등록글 완료 처리 + 판매자 UserBook 갱신
    if (dto.type === DealType.OLD) {
      const listingId = new ObjectId(dto.dealId!);

      const completeRes = await this.dealsRepository.updateOne(
        {
          _id: listingId,
          status: DealStatus.PROCESSING,
          reservedBy: buyerObjectId,
        },
        {
          $set: { status: DealStatus.COMPLETED, dealDate: new Date() },
          $unset: { reservedBy: '', reservedAt: '' },
        },
      );

      if (completeRes.modifiedCount === 0) {
        const now = await this.dealsRepository.findOneBy({ _id: listingId });
        if (!now) throw new BadRequestException('매물이 삭제되었습니다');
        if (now.status === DealStatus.COMPLETED) {
          // 이미 완료된 상태면 통과 (idempotent)
        } else if (
          now.status === DealStatus.PROCESSING &&
          ((now.reservedBy as any)?.toHexString?.() ??
            String(now.reservedBy)) !== buyerObjectId.toHexString()
        ) {
          throw new BadRequestException('다른 구매자가 선점한 매물입니다');
        } else {
          throw new BadRequestException('완료 처리 조건이 충족되지 않았습니다');
        }
      }

      // 판매자 user_books → SOLD
      const listing =
        listingForOld ??
        (await this.dealsRepository.findOneBy({ _id: listingId }));

      if (listing && sellerObjectId) {
        // sellerUserBook도 캐시 우선 사용
        const sellerUserBook =
          sellerUserBookForOld ??
          (await this.userBookRepository.findOne({
            where: { userId: sellerObjectId, dealId: listing.sourceDealId! },
          }));

        if (sellerUserBook) {
          (sellerUserBook as any).book_status = 'SOLD';
          (sellerUserBook as any).remainTime = 0;
          await this.userBookRepository.save(sellerUserBook);
        }
      }
    }

    //구매자 user_books 생성 시 transferDepth = (판매자 depth + 1)
    if (entityType === Type.OLD) {
      // listing 캐시 우선 사용
      const listing =
        listingForOld ??
        (dto.dealId
          ? await this.dealsRepository.findOneBy({
              _id: new ObjectId(dto.dealId),
            })
          : null);

      if (listing && sellerObjectId) {
        const sellerUserBook =
          sellerUserBookForOld ??
          (await this.userBookRepository.findOne({
            where: { userId: sellerObjectId, dealId: listing.sourceDealId! },
          }));

        if (sellerUserBook) {
          const sellerRemain = Number(
            (sellerUserBook as any)?.remainTransferCount ?? 0,
          );
          if (sellerRemain <= 0) {
            throw new BadRequestException('양도 가능 횟수를 초과한 도서입니다');
          }

          (sellerUserBook as any).remainTransferCount = sellerRemain - 1;
          await this.userBookRepository.save(sellerUserBook);

          buyerRemainTransferCount = sellerRemain - 1;
        } else {
          // ✅ book 메타도 캐시 우선 사용
          const book =
            bookMetaForOld ?? (await this.booksService.findOne(bookId));
          const maxTransferCountFromBook = Number(
            (book as any).maxTransferCount ?? 0,
          );
          buyerRemainTransferCount = maxTransferCountFromBook;
        }
      } else {
        const book =
          bookMetaForOld ?? (await this.booksService.findOne(bookId));
        const maxTransferCountFromBook = Number(
          (book as any).maxTransferCount ?? 0,
        );
        buyerRemainTransferCount = maxTransferCountFromBook;
      }
    }

    // 구매자 user_books: MINE 등록
    await this.userBookRepository.save(
      this.userBookRepository.create({
        userId: buyerObjectId,
        bookId: new ObjectId(bookId),
        dealId: saved._id,
        remainTime,
        totalTime: typeof totalSeconds === 'number' ? totalSeconds : undefined,
        book_status: 'MINE' as any,
        condition: conditionForRecord,
        remainTransferCount: buyerRemainTransferCount,
      }),
    );
    console.log('saved userbook:', saved);
    // 이벤트
    try {
      // OLD면 bookMetaForOld 재사용, 아니면 한 번만 조회
      const b =
        dto.type === DealType.OLD && bookMetaForOld
          ? bookMetaForOld
          : await this.booksService.findOne(bookId);

      this.eventEmitter.emit('deal.registered', {
        bookId: String(saved.bookId),
        dealId: saved._id?.toHexString?.() ?? String(saved._id),
        buyerId: buyerObjectId.toHexString(),
        sellerId: sellerObjectId?.toHexString?.(),
        type: entityType === Type.OLD ? 'OLD' : 'NEW',
        category: 'BOOK',
        title: (b as any).title,
        author: (b as any).author,
        image: (b as any).bookPic,
        price: saved.price,
      });
    } catch {
      this.eventEmitter.emit('deal.registered', {
        bookId: String(saved.bookId),
        dealId: saved._id?.toHexString?.() ?? String(saved._id),
        buyerId: buyerObjectId.toHexString(),
        sellerId: sellerObjectId?.toHexString?.(),
        type: entityType === Type.OLD ? 'OLD' : 'NEW',
        category: 'BOOK',
        price: saved.price,
      });
    }

    const [overlay] = await this.overlayBookMeta([saved]);
    return this.mapToInterface(overlay as any);
  }

  async getNewDealCountMapByBookIds(
    bookIds: string[],
  ): Promise<Map<string, number>> {
    const ids = (bookIds ?? []).filter(Boolean);
    if (ids.length === 0) return new Map();

    const objIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const match: any = {
      type: Type.NEW,
      status: DealStatus.COMPLETED || DealStatus.CANCELLED,
      $or: [
        { bookId: { $in: ids } }, // string으로 저장된 경우
        { bookId: { $in: objIds } as any }, // ObjectId로 저장된 경우
      ],
    };

    // MongoRepository는 aggregate 사용 가능
    const cursor = this.dealsRepository.aggregate([
      { $match: match },
      { $group: { _id: '$bookId', cnt: { $sum: 1 } } },
    ]);

    const rows = await cursor.toArray();
    const m = new Map<string, number>();
    for (const r of rows) {
      const key =
        typeof r._id === 'string'
          ? r._id
          : (r._id?.toHexString?.() ?? String(r._id ?? ''));
      m.set(key, Number(r.cnt ?? 0));
    }
    return m;
  }

  async getTopNewDealCounts(
    sinceDate: Date,
    limit = 20,
  ): Promise<Array<{ bookId: string; cnt: number }>> {
    const match: any = {
      type: Type.NEW,
      status: DealStatus.COMPLETED || DealStatus.CANCELLED,
      category: DealCategory.BOOK,
      dealDate: { $gte: sinceDate },
    };

    const cursor = this.dealsRepository.aggregate([
      { $match: match },
      { $group: { _id: '$bookId', cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } },
      { $limit: Math.max(1, Number(limit) || 20) },
    ]);

    const rows = await cursor.toArray();
    return rows.map((r) => ({
      bookId:
        typeof r._id === 'string'
          ? r._id
          : (r._id?.toHexString?.() ?? String(r._id ?? '')),
      cnt: Number(r.cnt ?? 0),
    }));
  }

  async findDoneByUserId(userId: string): Promise<DealSummary[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    const objectId = new ObjectId(userId);
    const results: DealSummary[] = [];

    // A-1) 내가 구매한 BOOK 거래 (NEW/OLD)
    const bookDealsBuyer = await this.dealsRepository.find({
      where: {
        buyerId: objectId,
        type: { $in: [Type.NEW, Type.OLD] } as any,
        status: { $in: [DealStatus.COMPLETED, DealStatus.CANCELLED] } as any,
      },
      order: { dealDate: 'DESC' as any },
    });

    // A-2) 내가 판매한 BOOK 거래 (OLD만)
    const bookDealsSeller = await this.dealsRepository.find({
      where: {
        sellerId: objectId,
        type: Type.OLD,
        status: DealStatus.COMPLETED,
        buyerId: { $ne: null } as any,
      },
      order: { dealDate: 'DESC' as any },
    });

    // B) 코인 거래(충전/현금전환/신규환불)
    const coinDeals = await this.dealsRepository.find({
      where: {
        buyerId: objectId,
        type: { $in: [Type.CHARGE, Type.TOCASH, Type.NEWREFUND] } as any,
        status: DealStatus.COMPLETED,
      },
      order: { dealDate: 'DESC' as any },
    });

    // user_books 맵 (다운로드/남은시간 등 보강)
    const userBooks = await this.userBookRepository.find({
      where: { userId: objectId as any },
    });
    const ubByDealId = new Map<string, any>();
    for (const ub of userBooks) {
      const k = (ub.dealId as any)?.toHexString?.() ?? String(ub.dealId ?? '');
      ubByDealId.set(k, ub);
    }

    // 한 번에 books 메타 오버레이
    const allDeals = [...bookDealsBuyer, ...bookDealsSeller, ...coinDeals];
    await this.overlayBookMeta(allDeals as any[]);

    // 구매 기록
    for (const d of bookDealsBuyer) {
      if (
        d.type === Type.OLD &&
        d.status === DealStatus.LISTING &&
        ((d.sellerId as any)?.toHexString?.() ?? String(d.sellerId ?? '')) ===
          objectId.toHexString()
      ) {
        continue;
      }

      const dealIdStr = (d._id as any)?.toHexString?.() ?? String(d._id ?? '');
      let ub = ubByDealId.get(dealIdStr);

      if (
        !ub &&
        d.type === Type.OLD &&
        d.status === DealStatus.LISTING &&
        d.sourceDealId
      ) {
        const srcIdStr =
          (d.sourceDealId as any)?.toHexString?.() ?? String(d.sourceDealId);
        ub = ubByDealId.get(srcIdStr);
      }

      const bookType: 'NEW' | 'OLD' = d.type === Type.OLD ? 'OLD' : 'NEW';
      const bookStatus =
        ub?.book_status ??
        (d.status === DealStatus.CANCELLED ? 'REFUNDED' : 'NONE');
      const isExpired =
        typeof ub?.remainTime === 'number' ? ub.remainTime === 0 : false;

      const remainMinutes =
        typeof ub?.remainTime === 'number'
          ? Math.max(0, Math.floor(ub.remainTime / 60))
          : undefined;
      const totalMinutes =
        typeof (d as any).totalTime === 'number'
          ? (d as any).totalTime
          : undefined;

      const base = this.mapToInterface(d);

      results.push({
        ...base,
        title: (d as any).title ?? '',
        author: (d as any).author ?? '',
        publisher: (d as any).publisher ?? '',
        bookPic: (d as any).bookPic ?? '',
        category: 'BOOK',
        bookType,
        isExpired,
        bookStatus,
        isDownloaded: Boolean(ub?.isDownloaded),

        remainTime: remainMinutes,
        totalTime: totalMinutes,
      } as any);
    }

    // 판매 기록 (OLD)
    for (const d of bookDealsSeller) {
      const base = this.mapToInterface(d);
      results.push({
        ...base,
        title: (d as any).title ?? '',
        author: (d as any).author ?? '',
        publisher: (d as any).publisher ?? '',
        bookPic: (d as any).bookPic ?? '',
        category: 'BOOK',
        bookType: 'OLD',
        isExpired: true,
        bookStatus: 'SOLD',
        isDownloaded: false,

        remainTime: 0,
        totalTime: (d as any).totalTime,
      } as any);
    }

    // 코인 거래
    for (const d of coinDeals) {
      if (d.type === Type.NEWREFUND) {
        const base = this.mapToInterface(d);
        results.push({
          ...base,
          // 환불 건은 책 맥락을 쓸 수 있으면 메타 포함(없으면 빈값)
          title: (d as any).title ?? '',
          author: (d as any).author ?? '',
          publisher: (d as any).publisher ?? '',
          bookPic: (d as any).bookPic ?? '',
          category: 'BOOK',
          bookType: 'NEW',
          isExpired: false,
          bookStatus: 'REFUNDED',
          isDownloaded: false,
        } as any);
      } else {
        const base = this.mapToInterface(d);
        results.push({ ...base, category: 'COIN' } as any);
      }
    }

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
      _id: new ObjectId(),
      buyerId: new ObjectId(userId),
      type: Type.CHARGE,
      price: dto.amount,
      status: DealStatus.COMPLETED,
      category: DealCategory.COIN,
    });

    const saved = await this.dealsRepository.save(deal);
    if (!saved) throw new NotFoundException('Failed to save charge deal');

    return this.mapToInterface(saved);
  }

  //코인 현금전환
  async coinToCash(
    dto: CreateToCashDto,
    buyerId: string,
  ): Promise<DealsInterface> {
    if (!ObjectId.isValid(buyerId)) {
      throw new BadRequestException('Invalid buyerId');
    }

    // 1) 보유 코인 조회
    const buyer = await this.usersService.findOne(buyerId);
    const currentBalance = Number((buyer as any)?.coin ?? 0);

    // 2) 잔액 초과 요청 차단
    const amount = Number(dto.amount ?? 0);
    const { bank, bankAccount } = dto;

    if (!bank || !bankAccount) {
      throw new BadRequestException('bank와 bankAccount는 필수입니다');
    }
    if (amount > currentBalance) {
      throw new BadRequestException(
        '보유 코인보다 많은 금액은 현금전환할 수 없습니다',
      );
    }
    const buyerObjectId = new ObjectId(buyerId);

    const deal = this.dealsRepository.create({
      _id: new ObjectId(),
      buyerId: buyerObjectId,
      type: Type.TOCASH,
      price: amount,
      dealDate: new Date().toISOString(),
      status: DealStatus.COMPLETED,
      category: DealCategory.COIN,

      metadata: {
        cashout: {
          bank,
          bankAccount,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    const saved = await this.dealsRepository.save(deal);

    if (!saved)
      throw new NotFoundException('Failed to find inserted cashout deal');

    try {
      await this.mailService.sendCashoutRequest({
        userId: buyerId,
        userEmail: (buyer as any)?.email,
        userName: (buyer as any)?.name ?? (buyer as any)?.nickname,
        amount,
        balanceBefore: currentBalance,
        bank: bank,
        bankAccount: bankAccount,
        balanceAfter: currentBalance - amount,
        requestedAt: saved.dealDate,
      });
    } catch (e) {
      console.error('sendCashoutRequest failed', e);
    }

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
      where: { _id: dealObjectId },
    });
    if (!deal) throw new NotFoundException(`Deal with id ${dealId} not found`);

    //소유 확인
    const isOwner = (deal.buyerId as ObjectId).equals(userObjectId);
    if (!isOwner)
      throw new ForbiddenException('본인이 구매한 거래만 환불할 수 있습니다');

    //이미 취소/완료된 이중 환불 방지
    if (deal.status === DealStatus.CANCELLED) {
      throw new BadRequestException('이미 처리된 거래입니다');
    }

    //환불 가능한 상태는 구매완료(COMPLETED)여야함
    if (deal.status !== DealStatus.COMPLETED) {
      throw new BadRequestException('환불할 수 없는 상태의 거래입니다');
    }

    //2) UserBook 찾기(해당 거래로 생성된 보유도서)
    const userBook = await this.userBookRepository.findOne({
      where: { userId: userObjectId, dealId: deal._id },
    });

    if (!userBook) {
      throw new BadRequestException('환불 대상 보유 도서를 찾을 수 없습니다');
    }

    //현재 중고 판매(SELLING) 중이면 환불 불가능
    if ((userBook as any).book_status === 'SELLING') {
      throw new BadRequestException(
        '중고 판매 등록 중인 도서는 환불할 수 없습니다',
      );
    }

    //현재 판매완료(SOLD) 중이면 환불 불가능
    if ((userBook as any).book_status === 'SOLD') {
      throw new BadRequestException(
        '이미 판매 완료된 도서는 환불할 수 없습니다.',
      );
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
      _id: new ObjectId(),
      buyerId: userObjectId,
      type: Type.NEWREFUND,
      category: 'BOOK' as any,
      price: refundAmount,
      dealDate: new Date().toISOString(),
      bookId:
        typeof deal.bookId === 'string'
          ? deal.bookId
          : ((deal.bookId as any)?.toHexString?.() ??
            String(deal.bookId ?? '')),
      status: DealStatus.COMPLETED,

      //환불이유 저장하고싶으면 DealsEntity에 nullable string 컬럼 하나 추가하기
    });
    await this.dealsRepository.save(refundRecord);

    //7) user book 삭제(다운로드 안했으므로 보유 취소)
    //await this.userBookRepository.delete({ _id: userBook._id });
    (userBook as any).book_status = 'REFUNDED';
    (userBook as any).remainTime = 0;
    await this.userBookRepository.save(userBook);

    return { message: '환불이 완료되었습니다', refundAmount };
  }

  async findAllCashouts(params?: {
    userId?: string;
    from?: string | Date; // 시작일(이상)
    to?: string | Date; // 종료일(미만)
  }) {
    const where: any = { type: Type.TOCASH };

    if (params?.userId && ObjectId.isValid(params.userId)) {
      where.buyerId = new ObjectId(params.userId);
    }

    const fromDate = params?.from ? new Date(params.from) : undefined;
    const toDate = params?.to ? new Date(params.to) : undefined;

    if ((fromDate && !isNaN(+fromDate)) || (toDate && !isNaN(+toDate))) {
      where.dealDate = {};
      if (fromDate && !isNaN(+fromDate)) where.dealDate.$gte = fromDate;
      if (toDate && !isNaN(+toDate)) where.dealDate.$lt = toDate;
    }

    const rows = await this.dealsRepository.find({
      where,
      order: { dealDate: 'DESC' as any },
    });

    return rows.map((d) => {
      const m = (d as any)?.metadata?.cashout ?? {};
      return {
        id: d._id?.toHexString?.() ?? String(d._id),
        userId: (d.buyerId as any)?.toHexString?.() ?? String(d.buyerId ?? ''),
        amount: Number(d.price ?? 0),
        status: d.status,
        dealDate: d.dealDate,
        bank: m.bank,
        bankAccount: m.bankAccount,
        requestedAt: m.requestedAt ?? d.dealDate,
      };
    });
  }

  private mapToInterface(entity: DealsEntity): DealsInterface {
    const remainMin =
      typeof (entity as any).remainTime === 'number'
        ? Math.max(0, Math.floor((entity as any).remainTime / 60))
        : undefined;

    const totalMin =
      typeof (entity as any).totalTime === 'number'
        ? Math.max(0, Math.floor((entity as any).totalTime))
        : undefined;
    return {
      id: entity._id?.toHexString() || '',
      type: entity.type,
      category: entity.category,
      buyerId:
        (entity.buyerId as any)?.toHexString?.() ??
        String(entity.buyerId ?? ''),
      sellerId:
        (entity.sellerId as any)?.toHexString?.() ??
        String(entity.sellerId ?? ''),

      publisherId:
        (entity.publisherId as any)?.toHexString?.() ??
        (entity.publisherId ? String(entity.publisherId) : null),

      bookId: entity.bookId,
      price: entity.price,

      condition: entity.condition,
      dealDate: entity.dealDate,
      registerDate: entity.registerDate,

      sourceDealId:
        entity.sourceDealId?.toHexString?.() ??
        String(entity.sourceDealId ?? ''),
      goodPoints: entity.goodPoints ?? [],
      comment: entity.comment ?? '',

      remainTime: remainMin,
      totalTime: totalMin,
    };
  }
}
