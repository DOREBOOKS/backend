import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { UserBooksEntity } from '../entities/userbooks.entity';
import { UserBooksInterface } from '../interfaces/userbooks.interface';
import { ObjectId } from 'mongodb';
import { DealsEntity } from 'src/deal/entity/deals.entity';
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

    // UserBooksEntity에서 현재 보유 중이거나 과거에 보유했던 책 모두 조회
    const userBooks = await this.userBookRepository.find({
      where: {
        userId: objectId as any,
        book_status: { $nin: ['REFUNDED', 'SOLD'] } as any, // 환불 혹은 판매완료된 책은 제외
      },
    });

    return userBooks.map((book) => this.mapToInterface(book));
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
