import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealsEntity } from '../entity/deals.entity';
import { CreateOldDealsDto } from '../dto/create-olddeals.dto';
import { DealsInterface } from '../interface/deals.interface';
import { ObjectId } from 'mongodb';
import { UpdateDealsDto } from '../dto/update-deals.dto';
import { CreateDealsDto } from '../dto/create-deals.dto';
import { BooksService } from 'src/books/service/book.service';
import { BookStatus, BookType } from 'src/books/entities/book.entity';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
    private readonly booksService: BooksService,
  ) {}

  async createOld(dto: CreateOldDealsDto): Promise<DealsInterface> {
    const userObjectId = new ObjectId(dto.userId);
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

    const deals = this.dealsRepository.create({
      ...dto,
      userId: new ObjectId(dto.userId),
      //registerId: new ObjectId(),
      dealId: new ObjectId(),
      registerDate: new Date(),
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

    return this.mapToInterface(saved);
  }

  async deleteDeals(dealId: string): Promise<{ message: string }> {
    if (!ObjectId.isValid(dealId)) {
      throw new BadRequestException(
        'Invalid dealId format. Must be a 24-character hex string.',
      );
    }
    const objectId = new ObjectId(dealId);
    const result = await this.dealsRepository.delete({ dealId: objectId });

    if (result.affected === 0) {
      throw new NotFoundException(`Deal with id ${dealId} not found`);
    }
    return { message: `Deal with id ${dealId} deleted successfully` };
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

    // 거래할 책 정보 조회
    const book = await this.booksService.findOne(bookObjectId.toHexString());
    if (!book) {
      throw new NotFoundException(`Book with id ${dto.bookId} not found`);
    }

    const deal = this.dealsRepository.create({
      dealId: new ObjectId(),
      //userId: new ObjectId(dto.buyerId), // 거래자 기준으로 설정
      buyerId: dto.buyerId,
      sellerId: dto.sellerId,
      bookId: dto.bookId,
      condition: dto.condition,
      price: dto.price,
      type: '중고',
      dealDate: dto.dealDate || new Date().toISOString(),
      registerDate: dto.registerDate || new Date().toISOString(),
      title: book.title,
      author: book.author,
      remainTime: book.total_time,
      publisher: book.publisher,
      image: book.book_pic,
    });

    const insertResult = await this.dealsRepository.insert(deal);
    const saved = await this.dealsRepository.findOneBy({
      _id: insertResult.identifiers[0]._id,
    });

    if (!saved) {
      throw new NotFoundException('Failed to find inserted deal');
    }

    //거래 완료 시 책 상태를 SOLD로 변경
    //await this.booksService.updateStatus(saved.bookId, BookStatus.SOLD);

    //구매자 기준으로 MIND 상태의 UserBook 등록
    const buyerUserBook = this.userBookRepository.create({
      userId: new ObjectId(dto.buyerId),
      //bookId: bookObjectId,
      dealId: saved.dealId,
      image: book.book_pic,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      remain_time: book.total_time,
      book_status: 'MINE' as any,
    });

    await this.userBookRepository.save(buyerUserBook);

    return this.mapToInterface(saved);
  }

  async findDoneByUserId(
    userId: string,
  ): Promise<
    (DealsInterface & { bookType: '신규' | '중고'; isExpired: boolean })[]
  > {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const objectId = new ObjectId(userId);

    const userBooks = await this.userBookRepository.find({
      where: { userId: objectId },
    });

    const results: (DealsInterface & {
      bookType: '신규' | '중고';
      isExpired: boolean;
    })[] = [];

    for (const userBook of userBooks) {
      const deal = await this.dealsRepository.findOne({
        where: { dealId: userBook.dealId },
      });

      if (!deal) continue;

      results.push({
        ...this.mapToInterface(deal),
        bookType: deal.type === '중고' ? '중고' : '신규',
        isExpired: userBook.remain_time === 0,
      });
    }

    return results;
  }

  private mapToInterface(entity: DealsEntity): DealsInterface {
    return {
      id: entity._id.toHexString() || '',
      //registerId: entity.registerId?.toHexString() || '',
      dealId: entity.dealId?.toHexString() || '',
      //userId: entity.userId.toHexString() || '',
      type: entity.type,
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
    };
  }
}
