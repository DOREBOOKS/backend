// src/user_book/service/userbooks.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // 유저별 보유 도서 조회 (메타는 항상 books 기준)
  async findByUserId(userId: string): Promise<UserBooksInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const objectId = new ObjectId(userId);

    // 1) 기본 보유 목록 (REFUNDED/SOLD 제외)
    const userBooks = await this.userBookRepository.find({
      where: {
        userId: objectId as any,
        book_status: { $nin: ['REFUNDED', 'SOLD'] } as any,
      },
    });

    // 2) bookId 수집 후 books 메타 배치 조회
    const bookIdSet = new Set<string>();
    for (const ub of userBooks) {
      const bid =
        typeof ub.bookId === 'string'
          ? ub.bookId
          : ((ub.bookId as any)?.toHexString?.() ?? String(ub.bookId ?? ''));
      if (bid) bookIdSet.add(bid);
    }
    const bookMap = await this.bookService.findManyByIds(Array.from(bookIdSet));

    // 3) SELLING이면 활성 등록글 찾아 dealId/price 반영 + DTO 조립
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

        // books 메타
        const bid =
          typeof ub.bookId === 'string'
            ? ub.bookId
            : ((ub.bookId as any)?.toHexString?.() ?? String(ub.bookId ?? ''));
        const b = bid ? bookMap.get(bid) : undefined;

        const transferDepth = Number((ub as any).transferDepth ?? 0);

        const dto: UserBooksInterface = {
          id: (ub._id as any)?.toHexString?.() ?? String(ub._id),
          userId: (ub.userId as any)?.toHexString?.() ?? String(ub.userId),
          dealId:
            overrideDealId ??
            (ub.dealId as any)?.toHexString?.() ??
            String(ub.dealId),
          bookId: bid,
          image: b?.bookPic ?? '',
          title: b?.title ?? '',
          author: b?.author ?? '',
          publisher: b?.publisher ?? '',
          remain_time: (ub as any).remainTime,
          book_status: (ub as any).book_status,
          condition: (ub as any).condition ?? 'RENT',
          priceOwn: Number.isFinite(b?.priceOwn as any)
            ? Number(b!.priceOwn)
            : null,
          priceRent: Number.isFinite(b?.priceRent as any)
            ? Number(b!.priceRent)
            : null,
          price: overrideDealId ? listingPrice : null,
          transferDepth,
        };

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

    const bookId =
      typeof userBook.bookId === 'string'
        ? userBook.bookId
        : ((userBook.bookId as any)?.toHexString?.() ??
          String(userBook.bookId));
    const book = await this.bookService.findOne(bookId);
    Object.assign(userBook, { isDownloaded: true });

    await this.userBookRepository.save(userBook);
    return book.cdnUrl;
  }
}
