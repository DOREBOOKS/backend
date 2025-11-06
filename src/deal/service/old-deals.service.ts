import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DealsEntity,
  Type as DealType,
  DealStatus,
} from 'src/deal/entity/deals.entity';
import { BookEntity } from 'src/books/entities/book.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { RelationsService } from 'src/user_relation/service/relations.service';
import { ObjectId } from 'mongodb';
import { ReviewEntity } from 'src/review/entities/review.entity';

type OldGroupSort = 'popular' | 'recent' | 'review' | 'price';

export type OldDealView = {
  dealId: string;
  sellerId: string;
  sellerName?: string;
  price: number;
  date: Date;
  remainTime: number;
  goodPoints: string[];
  comment: string;
  transferDepth?: number;
  priceOriginal?: number | null;
  priceRent?: number | null;
  priceOwn?: number | null;
  commentBlocked?: boolean;
};

export type OldDealGroupLite = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  bookPic: string;
};

export type BookMeta = {
  id: string;
  title: string;
  author: string;
  publisher: string;
  bookPic: string;
  priceOriginal?: number | null;
  priceRent?: number | null;
  priceOwn?: number | null;
  totalTime: number | null;
};

export type PagedWithBook<T> = {
  total: number;
  items: T[];
  book: BookMeta;
};

export type Paged<T> = { total: number; items: T[] };
export type GroupedPaged<T> = {
  total: number;
  page: number;
  limit: number;
  items: T[];
};
export type RecentGroup = {
  book: BookMeta;
  items: OldDealView[];
};

@Injectable()
export class OldDealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepo: Repository<DealsEntity>,
    @InjectRepository(BookEntity)
    private readonly booksRepo: Repository<BookEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepo: Repository<ReviewEntity>,
    private readonly relationsService: RelationsService,
  ) {}

  private async loadUserNamesMap(userIds: string[]) {
    const uniq = Array.from(new Set(userIds.filter(Boolean)));
    if (uniq.length === 0) return new Map<string, string>();

    const objIds = uniq.map((id) => new ObjectId(id));
    const rows = await this.usersRepo.find({
      where: { _id: { $in: objIds } as any },
      select: ['_id', 'nickname'],
    });
    const m = new Map<string, string>();
    for (const u of rows) m.set(u._id.toHexString(), u.nickname);
    return m;
  }

  private toRemainMinutes(
    fallbackBookTotalTimeMin?: number,
    dealRemainSec?: number,
  ) {
    const sec =
      typeof dealRemainSec === 'number'
        ? dealRemainSec
        : typeof fallbackBookTotalTimeMin === 'number'
          ? fallbackBookTotalTimeMin * 60
          : 0;
    return Math.max(0, Math.floor(sec / 60));
  }

  private async buildSellerBlockedMap(viewerId: string, sellerIds: string[]) {
    const uniq = Array.from(new Set(sellerIds.filter(Boolean)));
    if (!viewerId || uniq.length === 0) return new Map<string, boolean>();
    const m = new Map<string, boolean>();

    // 단건 API만 있으면 Promise.all
    await Promise.all(
      uniq.map(async (sid) => {
        try {
          const blocked = await this.relationsService.isBlocked(viewerId, sid);
          m.set(sid, !!blocked);
        } catch {
          m.set(sid, false);
        }
      }),
    );
    return m;
  }

  /// 최근 중고 매물
  async findRecent(viewerId: string, take = 20): Promise<RecentGroup[]> {
    const limit = Math.min(Math.max(Number(take) || 20, 1), 50);

    // 1) 최신 등록 매물 넉넉히 긁어옴 (그룹 손실 방지)
    const deals = await this.dealsRepo.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      } as any,
      order: { registerDate: 'DESC', _id: 'DESC' },
      take: limit * 10,
    });
    if (!deals.length) return [];

    // 2) book / seller 메타 배치
    const bookIds = Array.from(
      new Set(
        deals
          .map((d) =>
            typeof d.bookId === 'string'
              ? d.bookId
              : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? '')),
          )
          .filter(Boolean),
      ),
    );
    const objIds = bookIds.map((id) => new ObjectId(id));
    const books = await this.booksRepo.find({
      where: { _id: { $in: objIds } as any },
    });
    const bookById = new Map(books.map((b) => [b._id.toHexString(), b]));

    const sellerIds = deals
      .map(
        (d) =>
          (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? ''),
      )
      .filter(Boolean);
    const userNamesMap = await this.loadUserNamesMap(sellerIds);

    // 3) OldDealView로 매핑 (item.book 제거)
    const mapped: OldDealView[] = deals.map((d) => {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));
      const b = bid ? bookById.get(bid) : undefined;
      const sellerId =
        (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? '');
      return {
        dealId:
          (d as any)?._id?.toHexString?.() ?? String((d as any)?._id ?? ''),
        sellerId,
        sellerName: userNamesMap.get(sellerId) ?? '',
        goodPoints: Array.isArray(d.goodPoints) ? d.goodPoints : [],
        comment: d.comment ?? '',
        price: Number(d.price),
        date: d.registerDate,
        remainTime: this.toRemainMinutes(
          (b as any)?.totalTime,
          (d as any)?.remainTime,
        ),
        transferDepth: (d as any).transferDepth ?? 0,
        priceOriginal: b?.priceOriginal ?? null,
        priceRent: b?.priceRent ?? null,
        priceOwn: b?.priceOwn ?? null,
      };
    });

    // 4) 차단 플래그 주입
    const withFlags = await this.annotateBlocked(viewerId, mapped);

    // 5) 도서별 그룹핑
    const groupMap = new Map<string, RecentGroup>();
    for (const it of withFlags) {
      // priceOriginal/Rent/Own 주입을 위해 bookId가 필요하므로 deals에서 직접 뽑음
      const d = deals.find(
        (x) =>
          ((x as any)?._id?.toHexString?.() ??
            String((x as any)?._id ?? '')) === it.dealId,
      );
      const bid = d
        ? typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''))
        : undefined;
      if (!bid) continue;
      const b = bookById.get(bid);
      if (!b) continue;

      if (!groupMap.has(bid)) {
        groupMap.set(bid, {
          book: {
            id: b._id.toHexString(),
            title: b.title,
            author: b.author,
            publisher: b.publisher,
            bookPic: b.bookPic,
            priceOriginal: b.priceOriginal ?? null,
            priceRent: b.priceRent ?? null,
            priceOwn: b.priceOwn ?? null,
            totalTime: b.totalTime ?? null,
          },
          items: [],
        });
      }
      groupMap.get(bid)!.items.push(it);
    }

    // 6) 그룹 내 아이템 최신순 정렬
    for (const g of groupMap.values()) {
      g.items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    // 7) 그룹 최신순(각 그룹 첫 아이템 기준) + 상위 N개만
    const groups = Array.from(groupMap.values())
      .sort((ga, gb) => {
        const ta = ga.items[0]?.date ? new Date(ga.items[0].date).getTime() : 0;
        const tb = gb.items[0]?.date ? new Date(gb.items[0].date).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);

    return groups;
  }

  // 책별 중고 매물
  async findByBook(
    bookId: string,
    skip = 0,
    take = 20,
  ): Promise<PagedWithBook<OldDealView>> {
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException('Invalid bookId format. Must be 24-hex.');
    }
    const book = await this.booksRepo.findOneBy({ _id: new ObjectId(bookId) });
    if (!book) {
      return {
        total: 0,
        items: [],
        book: {
          id: bookId,
          title: '',
          author: '',
          publisher: '',
          bookPic: '',
          priceOriginal: null,
          priceRent: null,
          priceOwn: null,
          totalTime: null,
        },
      };
    }

    const allDeals = await this.dealsRepo.find({
      where: {
        bookId: { $in: [bookId, new ObjectId(bookId) as any] } as any,
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      } as any,
      order: { registerDate: 'DESC' },
    });

    const sellerIds = allDeals
      .map(
        (d) =>
          (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? ''),
      )
      .filter(Boolean);
    const userNamesMap = await this.loadUserNamesMap(sellerIds);

    const mapped: OldDealView[] = allDeals.map((d) => {
      const sellerId =
        (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? '');
      const dealId =
        (d as any)?._id?.toHexString?.() ?? String((d as any)?._id ?? '');

      return {
        dealId,
        sellerId,
        sellerName: userNamesMap.get(sellerId) ?? '',
        goodPoints: Array.isArray((d as any)?.goodPoints)
          ? (d as any).goodPoints
          : [],
        comment: d.comment ?? '',
        price: Number(d.price),
        date: d.registerDate,
        remainTime: this.toRemainMinutes(
          book.totalTime,
          (d as any)?.remainTime,
        ),
        transferDepth: (d as any).transferDepth ?? 0,

        priceOriginal: book.priceOriginal ?? null,
        priceRent: book.priceRent ?? null,
        priceOwn: book.priceOwn ?? null,
      };
    });

    const slice = mapped.slice(skip, skip + take);
    return {
      total: mapped.length,
      items: slice,
      book: {
        id: book._id.toHexString(),
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        bookPic: book.bookPic,
        priceOriginal: book.priceOriginal ?? null,
        priceRent: book.priceRent ?? null,
        priceOwn: book.priceOwn ?? null,
        totalTime: book.totalTime ?? null,
      },
    };
  }

  // 차단 여부
  async annotateBlocked(viewerId: string, items: OldDealView[]) {
    if (!viewerId || !items?.length) return items;
    const sellerIds = items.map((it) => it.sellerId).filter(Boolean);
    const blocked = await this.buildSellerBlockedMap(viewerId, sellerIds);
    return items.map((it) => ({
      ...it,
      commentBlocked: blocked.get(it.sellerId) === true,
    }));
  }

  // 가격 히스토리/카운트 간단 요약
  async getStatsByBookId(bookId: string) {
    const oldBooks = await this.dealsRepo.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ bookId }, { bookId: new ObjectId(bookId) as any }],
        $and: [{ $or: [{ buyerId: null }, { buyerId: { $exists: false } }] }],
      } as any,
    });
    return {
      count: oldBooks.length,
      books: oldBooks.map((d) => ({
        bookId: d.bookId,
        price: Number(d.price),
        date: d.registerDate,
      })),
    };
  }

  private escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async findBookIdsByCategory(
    category?: string,
    q?: string,
  ): Promise<string[] | null> {
    const where: any = {};
    if (category) where.category = category;

    if (q && q.trim()) {
      const re = new RegExp(this.escapeRegex(q.trim()), 'i');
      where.title = re;
    }

    // 아무 필터도 없으면 null 반환(= 필터 미적용)
    if (!Object.keys(where).length) return null;

    const rows = await this.booksRepo.find({
      where: where as any,
      select: ['_id'] as any,
      take: 5000,
    });
    return rows.map((b) => b._id.toHexString());
  }

  private remainMinutesOf(deal: DealsEntity, book?: BookEntity) {
    const bookTotalMin =
      typeof (book as any)?.totalTime === 'number'
        ? (book as any).totalTime
        : undefined;
    return this.toRemainMinutes(bookTotalMin, (deal as any)?.remainTime);
  }

  // BookEntity에서 발매일/출간일 가져오기
  private getPublishTime(b?: BookEntity | undefined): number {
    if (!b) return 0;
    const cand =
      (b as any).publicationDate ??
      (b as any).releaseDate ??
      (b as any).publishedAt ??
      (b as any).pubDate ??
      (b as any).pubdate ??
      null;
    const t =
      cand instanceof Date
        ? cand.getTime()
        : Number(new Date(cand as any).getTime());
    return Number.isFinite(t) ? t : 0;
  }

  // 도서별 누적 중고거래 횟수(히스토리) 맵 생성
  private async buildPopularityMap(bookIds: string[]) {
    if (!bookIds?.length) return new Map<string, number>();

    const hist = await this.dealsRepo.find({
      where: {
        type: DealType.OLD,
        $or: [
          { bookId: { $in: bookIds } },
          { bookId: { $in: bookIds.map((id) => new ObjectId(id)) } as any },
        ],
      } as any,
      select: ['bookId'] as any,
      take: 200000,
    });

    const m = new Map<string, number>();
    for (const d of hist) {
      const bid =
        typeof (d as any).bookId === 'string'
          ? (d as any).bookId
          : ((d as any).bookId?.toHexString?.() ??
            String((d as any).bookId ?? ''));
      if (!bid) continue;
      m.set(bid, (m.get(bid) ?? 0) + 1);
    }
    return m;
  }

  private async buildReviewCountMap(bookIds: string[]) {
    const m = new Map<string, number>();
    if (!bookIds?.length) return m;

    const objIds = bookIds
      .filter(Boolean)
      .filter(ObjectId.isValid)
      .map((id) => new ObjectId(id));
    if (!objIds.length) return m;

    const rows = await this.reviewsRepo.find({
      where: { bookId: { $in: objIds } as any },
      select: ['bookId'] as any,
      take: 500000,
    });

    for (const r of rows) {
      const hex =
        (r as any)?.bookId?.toHexString?.() ?? String((r as any)?.bookId ?? '');
      if (!hex) continue;
      m.set(hex, (m.get(hex) ?? 0) + 1);
    }
    return m;
  }

  async findOldGroupedSummaryByBook(params: {
    category?: string;
    sort?: OldGroupSort;
    skip?: number;
    take?: number;
    q?: string;
  }): Promise<GroupedPaged<OldDealGroupLite>> {
    const { category, sort = 'popular', skip = 0, take = 20, q } = params;

    const categoryBookIds = await this.findBookIdsByCategory(category, q);
    const bookIdFilter =
      categoryBookIds && categoryBookIds.length
        ? {
            $or: [
              { bookId: { $in: categoryBookIds } },
              {
                bookId: {
                  $in: categoryBookIds.map((id) => new ObjectId(id)),
                } as any,
              },
            ],
          }
        : {};

    // 현재 LISTING된 OLD 딜만 수집 (그룹 대상)
    const allDeals = await this.dealsRepo.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
        ...(bookIdFilter as any),
      } as any,
    });
    if (allDeals.length === 0) {
      return {
        total: 0,
        page: Math.floor(skip / take) + 1,
        limit: take,
        items: [],
      };
    }

    // book 메타
    const bookIds = Array.from(
      new Set(
        allDeals
          .map((d) =>
            typeof d.bookId === 'string'
              ? d.bookId
              : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? '')),
          )
          .filter(Boolean),
      ),
    );
    const objIds = bookIds.map((id) => new ObjectId(id));
    const books = await this.booksRepo.find({
      where: { _id: { $in: objIds } as any },
    });
    const bookById = new Map(books.map((b) => [b._id.toHexString(), b]));

    const minPriceMap = new Map<string, number>();
    const grouped = new Map<string, DealsEntity[]>();
    for (const d of allDeals) {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));
      if (!bid) continue;
      if (!grouped.has(bid)) grouped.set(bid, []);
      grouped.get(bid)!.push(d);
    }

    for (const [bid, deals] of grouped.entries()) {
      const minP = deals.length
        ? Math.min(...deals.map((d) => Number(d.price ?? Infinity)))
        : Infinity;
      minPriceMap.set(bid, minP);
    }

    const popularityMap = await this.buildPopularityMap(bookIds);
    const reviewCountMap = await this.buildReviewCountMap(bookIds);

    // 정렬
    const groupEntries = Array.from(grouped.entries());
    groupEntries.sort((a, b) => {
      const [bidA] = a;
      const [bidB] = b;
      const bookA = bookById.get(bidA);
      const bookB = bookById.get(bidB);

      switch (sort) {
        case 'popular': {
          const pa = popularityMap.get(bidA) ?? 0;
          const pb = popularityMap.get(bidB) ?? 0;
          if (pb !== pa) return pb - pa;
          // 2차: 가격 낮은 순
          const ca = minPriceMap.get(bidA) ?? Infinity;
          const cb = minPriceMap.get(bidB) ?? Infinity;
          if (ca !== cb) return ca - cb;
          // 3차: id로 안정화
          return bidA.localeCompare(bidB);
        }

        case 'recent': {
          // publicationDate 기준 최신 우선
          const ra = this.getPublishTime(bookA);
          const rb = this.getPublishTime(bookB);
          if (rb !== ra) return rb - ra;

          // 동점 처리: 인기순 → 최저가순
          const pa = popularityMap.get(bidA) ?? 0;
          const pb = popularityMap.get(bidB) ?? 0;
          if (pb !== pa) return pb - pa;

          const ca = minPriceMap.get(bidA) ?? Infinity;
          const cb = minPriceMap.get(bidB) ?? Infinity;
          if (ca !== cb) return ca - cb;

          return bidA.localeCompare(bidB);
        }

        case 'review': {
          const ra = reviewCountMap.get(bidA) ?? 0;
          const rb = reviewCountMap.get(bidB) ?? 0;
          if (rb !== ra) return rb - ra;
          const ca = minPriceMap.get(bidA) ?? Infinity;
          const cb = minPriceMap.get(bidB) ?? Infinity;
          if (ca !== cb) return ca - cb;
          return bidA.localeCompare(bidB);
        }

        case 'price': {
          const ca = minPriceMap.get(bidA) ?? Infinity;
          const cb = minPriceMap.get(bidB) ?? Infinity;
          if (ca !== cb) return ca - cb;
          const pa = popularityMap.get(bidA) ?? 0;
          const pb = popularityMap.get(bidB) ?? 0;
          if (pb !== pa) return pb - pa;
          return bidA.localeCompare(bidB);
        }

        default: {
          const pa = popularityMap.get(bidA) ?? 0;
          const pb = popularityMap.get(bidB) ?? 0;
          if (pb !== pa) return pb - pa;
          const ca = minPriceMap.get(bidA) ?? Infinity;
          const cb = minPriceMap.get(bidB) ?? Infinity;
          if (ca !== cb) return ca - cb;
          return bidA.localeCompare(bidB);
        }
      }
    });

    const totalGroups = groupEntries.length;
    const sliced = groupEntries.slice(skip, skip + take);

    const items: OldDealGroupLite[] = sliced.map(([bid]) => {
      const b = bookById.get(bid);
      const mp = minPriceMap.get(bid) ?? Infinity;
      const pubMs = this.getPublishTime(b);
      return {
        id: (b as any)._id.toHexString(),
        title: (b as any).title,
        author: (b as any).author,
        publisher: (b as any).publisher,
        bookPic: (b as any).bookPic,
      };
    });

    return {
      total: totalGroups,
      page: Math.floor(skip / take) + 1,
      limit: take,
      items,
    };
  }
}
