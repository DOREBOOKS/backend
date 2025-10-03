import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserBooksEntity } from '../entities/userbooks.entity';
import { UserBooksInterface } from '../interfaces/userbooks.interface';
import { ObjectId } from 'mongodb';
import { DealsEntity, DealStatus, Type } from 'src/deal/entity/deals.entity';
import { BooksService } from 'src/books/service/book.service';

@Injectable()
export class UserBooksService {
  constructor(
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
    private readonly bookService: BooksService,
  ) {}

  // 유저별 보유 도서 조회
  async findByUserId(userId: string): Promise<UserBooksInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const objectId = new ObjectId(userId);

    // 1) 기본 보유 목록 조회 (REFUNDED/SOLD 제외)
    const userBooks = await this.userBookRepository.find({
      where: {
        userId: objectId as any,
        book_status: { $nin: ['REFUNDED', 'SOLD'] } as any,
      },
    });

    // 2) 필요한 bookId 모아서 가격 정보 미리 가져오기
    const bookIdSet = new Set<string>();
    for (const ub of userBooks) {
      const bid =
        typeof ub.bookId === 'string'
          ? ub.bookId
          : ((ub.bookId as any)?.toHexString?.() ?? String(ub.bookId ?? ''));
      if (bid) bookIdSet.add(bid);
    }

    const bookPriceMap = new Map<
      string,
      { priceRent?: number | null; priceOwn?: number | null }
    >();

    // BooksService.findOne을 재사용해도 되고, findByIds가 있으면 더 좋음
    await Promise.all(
      Array.from(bookIdSet).map(async (bid) => {
        try {
          const book = await this.bookService.findOne(bid);
          bookPriceMap.set(bid, {
            priceRent: Number.isFinite(book.priceRent as any)
              ? Number(book.priceRent)
              : null,
            priceOwn: Number.isFinite(book.priceOwn as any)
              ? Number(book.priceOwn)
              : null,
          });
        } catch (_) {
          bookPriceMap.set(bid, { priceRent: null, priceOwn: null });
        }
      }),
    );

    // 3) SELLING이면 활성 등록글 찾아 dealId 교체 + 등록가(price) 포함
    const enriched = await Promise.all(
      userBooks.map(async (ub) => {
        let overrideDealId: string | null = null;
        let listingPrice: number | null = null;

        if (ub.book_status === 'SELLING') {
          const activeListing = await this.dealsRepository.findOne({
            where: {
              sellerId: objectId as any,
              type: Type.OLD,
              sourceDealId: ub.dealId as any,
              status: {
                $in: [DealStatus.LISTING, DealStatus.PROCESSING],
              } as any,
            } as any,
            order: { registerDate: 'DESC' as any },
          });

          if (activeListing?._id) {
            overrideDealId =
              (activeListing._id as any)?.toHexString?.() ??
              String(activeListing._id);
            listingPrice = Number.isFinite(activeListing.price as any)
              ? Number(activeListing.price)
              : null;
          }
        }

        const dto = this.mapToInterface(ub);
        // 책 가격 스냅샷 주입
        const bid =
          typeof ub.bookId === 'string'
            ? ub.bookId
            : ((ub.bookId as any)?.toHexString?.() ?? String(ub.bookId ?? ''));
        const priceSnap = bookPriceMap.get(bid);
        dto.priceRent = priceSnap?.priceRent ?? null;
        dto.priceOwn = priceSnap?.priceOwn ?? null;

        // 활성 등록글: dealId 교체 + 등록가 포함
        if (overrideDealId) {
          dto.dealId = overrideDealId;
          dto.price = listingPrice; // 유저가 등록했던 판매가
        } else {
          dto.price = null; // 판매중이 아니거나, 활성 등록글 못 찾으면 null
        }
        return dto;
      }),
    );

    return enriched;
  }

  async findBookUrlWithUserBookId(userId: string, userBookId: string) {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const userObjectId = new ObjectId(userId);
    const userBookObjectId = new ObjectId(userBookId);

    const userBook = await this.userBookRepository.findOne({
      where: { userId: userObjectId, _id: userBookObjectId },
    });

    if (!userBook) {
      throw new BadRequestException('no userBook with userId and userBookId');
    }

    const book = await this.bookService.findOne(userBook.bookId.toString());
    Object.assign(userBook, { isDownloaded: true });

    await this.userBookRepository.save(userBook);

    return book.cdnUrl;
  }
  // entity → interface 매핑 함수
  private mapToInterface(entity: UserBooksEntity): UserBooksInterface {
    return {
      id: entity._id.toHexString(),
      userId: entity.userId.toString(),
      dealId: entity.dealId.toString(),
      bookId: entity.bookId?.toString(),
      image: entity.image,
      title: entity.title,
      author: entity.author,
      publisher: entity.publisher,
      remain_time: entity.remainTime,
      book_status: entity.book_status,
      condition: entity.condition ?? 'RENT', // TODO : has to fix
      //isOwned: entity.isOwned,
      priceOwn: entity.priceOwn,
      priceRent: entity.priceRent,
      price: entity.price,
    };
  }
}
