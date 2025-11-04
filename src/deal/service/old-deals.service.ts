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
  book?: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    coverUrl: string;
    dealId: string;
  } | null;
  commentBlocked?: boolean;
};

export type Paged<T> = { total: number; items: T[] };

@Injectable()
export class OldDealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepo: Repository<DealsEntity>,
    @InjectRepository(BookEntity)
    private readonly booksRepo: Repository<BookEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
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
  async findRecent(take = 20): Promise<Paged<OldDealView>> {
    const limit = Math.min(Math.max(Number(take) || 20, 1), 50);

    const deals = await this.dealsRepo.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      } as any,
      order: { registerDate: 'DESC' },
      take: limit,
    });
    if (deals.length === 0) return { items: [], total: 0 };

    // bookId → BookEntity 배치
    const bookIdSet = new Set<string>();
    const sellerIds: string[] = [];
    for (const d of deals) {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));
      if (bid) bookIdSet.add(bid);

      const sid =
        (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? '');
      if (sid) sellerIds.push(sid);
    }

    const objIds = Array.from(bookIdSet).map((id) => new ObjectId(id));
    const books = await this.booksRepo.find({
      where: { _id: { $in: objIds } as any },
    });
    const bookById = new Map(books.map((b) => [b._id.toHexString(), b]));
    const userNamesMap = await this.loadUserNamesMap(sellerIds);

    const items: OldDealView[] = deals.map((d) => {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));

      const b = bid ? bookById.get(bid) : undefined;

      const dealId =
        (d as any)?._id?.toHexString?.() ?? String((d as any)?._id ?? '');
      const sellerId =
        (d.sellerId as ObjectId)?.toHexString?.() ?? String(d.sellerId ?? '');

      return {
        dealId,
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
        book: b
          ? {
              id: b._id.toHexString(),
              title: b.title,
              author: b.author,
              publisher: b.publisher,
              coverUrl: b.bookPic,
              dealId,
            }
          : null,
      };
    });

    return { items, total: items.length };
  }

  // 책별 중고 매물
  async findByBook(
    bookId: string,
    skip = 0,
    take = 20,
  ): Promise<Paged<OldDealView>> {
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException('Invalid bookId format. Must be 24-hex.');
    }
    const book = await this.booksRepo.findOneBy({ _id: new ObjectId(bookId) });
    if (!book) return { items: [], total: 0 };

    const allDeals = await this.dealsRepo.find({
      where: {
        bookId: { $in: [bookId, new ObjectId(bookId) as any] } as any,
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      } as any,
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
        book: {
          id: book._id.toHexString(),
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          coverUrl: book.bookPic,
          dealId,
        },
      };
    });

    const slice = mapped.slice(skip, skip + take);
    return { total: mapped.length, items: slice };
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
}
