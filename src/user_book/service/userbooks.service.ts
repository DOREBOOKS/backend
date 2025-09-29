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

    // 2) SELLING 인 항목은 "현재 활성 등록글"을 찾아 dealId를 등록글 id로 덮어쓰기
    const enriched = await Promise.all(
      userBooks.map(async (ub) => {
        let overrideDealId: string | null = null;

        if (ub.book_status === 'SELLING') {
          // 내가 올린 등록글(OLD) 중, sourceDealId = 최초 구매 dealId,
          // 상태가 LISTING 또는 PROCESSING 인 최신 것을 찾는다
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
          }
        }

        const dto = this.mapToInterface(ub);
        if (overrideDealId) {
          dto.dealId = overrideDealId;
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
    };
  }
}
