import {
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookEntity } from '../entities/book.entity';
import { CreateBookDto } from '../dto/create-book.dto';
import { ReadBookDto } from '../dto/read-book.dto';
import { BookInterface } from '../interfaces/book.interface';
import { ObjectId } from 'mongodb';
//import { BookStatus } from '../entities/book.entity';
import { BookType } from '../entities/book.entity';
import { DealsEntity } from 'src/deal/entity/deals.entity';
//import { Type as DealType, DealStatus } from 'src/deal/entity/deals.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReviewEntity } from 'src/review/entities/review.entity';
import { DealsService } from 'src/deal/service/deals.service';
import { RelationsService } from 'src/user_relation/service/relations.service';

const toUtcMidnight = (d: string): Date => new Date(`${d}T00:00:00.000Z`);

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,

    // @InjectRepository(DealsEntity)
    // private readonly dealsRepository: Repository<DealsEntity>,

    // @InjectRepository(UserEntity)
    // private readonly usersRepository: Repository<UserEntity>,

    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,

    private readonly eventEmitter: EventEmitter2,

    @Inject(forwardRef(() => DealsService))
    private readonly dealsService: DealsService,

    // @Inject(forwardRef(() => RelationsService))
    // private readonly relationsService: RelationsService,
  ) {}

  //리뷰 개수 조회
  private async getReviewCountMap(
    bookIds: string[],
  ): Promise<Map<string, number>> {
    const objIds = bookIds
      .filter(Boolean)
      .filter(ObjectId.isValid)
      .map((id) => new ObjectId(id));
    if (objIds.length === 0) return new Map();

    const rows = await this.reviewRepository.find({
      where: { bookId: { $in: objIds } as any },
      select: ['bookId'] as any,
    });

    const m = new Map<string, number>();
    for (const r of rows) {
      const hex = (r.bookId as any)?.toHexString?.() ?? String(r.bookId);
      m.set(hex, (m.get(hex) ?? 0) + 1);
    }
    return m;
  }

  async read(readBookDto: ReadBookDto): Promise<BookInterface> {
    const book = await this.bookRepository.findOneBy({
      title: readBookDto.title,
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    try {
      return this.mapToInterface(book);
    } catch (error: any) {
      // TODO : has to define error type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const code = error.code ?? error.driverError?.code;
      if (code === 11000) {
        throw new ConflictException('Error');
      }
      throw error;
    }
  }

  async findAll(): Promise<BookInterface[]> {
    const books = await this.bookRepository.find();
    return books.map((book) => this.mapToInterface(book));
  }

  async findBooks(options: {
    category?: string;
    sort?: string;
    skip?: number;
    take?: number;
    id?: string;
    q?: string;
  }): Promise<
    | BookInterface
    | {
        total: number;
        page: number;
        limit: number;
        items: BookInterface[];
      }
  > {
    const { id, category, sort, skip = 0, take = 20, q } = options;

    // id가 있는 경우
    if (id) {
      if (!ObjectId.isValid(id)) {
        throw new BadRequestException(
          'Invalid bookId format. Must be a 24-character hex string.',
        );
      }

      const objectId = new ObjectId(id);
      const book = await this.bookRepository.findOneBy({ _id: objectId });
      if (!book) {
        throw new NotFoundException(`Bood with id ${id} not found`);
      }

      //도서별 리뷰 수
      const reviewCountMap = await this.getReviewCountMap([
        book._id.toHexString(),
      ]);
      const reviewCount = reviewCountMap.get(book._id.toHexString()) ?? 0;

      return {
        ...this.mapToInterface(book),
        reviewCount,
      } as any;
    }

    const where: any = { type: BookType.NEW };
    if (category) where.category = category;

    if (q && q.trim()) {
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      where.title = new RegExp(escape(q.trim()), 'i');
    }

    const order: any = {};
    if (sort === 'recent') order.publicationDate = 'DESC';
    else if (sort === 'price') order.priceOwn = 'ASC';

    const newBooks = await this.bookRepository.find({ where, order });

    //리뷰수 정렬
    let reviewCountMap: Map<string, number> | undefined = undefined;
    if (sort === 'review') {
      const ids = newBooks.map((b) => b._id.toHexString());
      reviewCountMap = await this.getReviewCountMap(ids);

      newBooks.sort((a, b) => {
        const ac = reviewCountMap!.get(a._id.toHexString()) ?? 0;
        const bc = reviewCountMap!.get(b._id.toHexString()) ?? 0;
        if (bc !== ac) return bc - ac;
        // 보조키: 출간일 최신순
        const ad = (a as any).publicationDate as Date | undefined;
        const bd = (b as any).publicationDate as Date | undefined;
        return (bd?.getTime?.() ?? 0) - (ad?.getTime?.() ?? 0);
      });
    }

    // bookIds 뽑기
    const bookIds = newBooks.map((b) => b._id.toHexString());
    // NEW + COMPLETED 거래수 집계
    const newDealCountMap =
      await this.dealsService.getNewDealCountMapByBookIds(bookIds);

    if (sort === 'popular') {
      newBooks.sort((a, b) => {
        const ac = newDealCountMap.get(a._id.toHexString()) ?? 0;
        const bc = newDealCountMap.get(b._id.toHexString()) ?? 0;
        if (bc !== ac) return bc - ac;
        const ad = (a as any).publicationDate as Date | undefined;
        const bd = (b as any).publicationDate as Date | undefined;
        return (bd?.getTime?.() ?? 0) - (ad?.getTime?.() ?? 0);
      });
    }

    const mapped: BookInterface[] = newBooks.map((book) => {
      const reviewCount = reviewCountMap?.get(book._id.toHexString()) ?? 0;
      const bookDealCount = newDealCountMap.get(book._id.toHexString()) ?? 0;
      return {
        ...this.mapToInterface(book),
        reviewCount,
        bookDealCount,
      } as any;
    });

    const pagedItems = mapped.slice(skip, skip + take);
    return {
      total: mapped.length,
      page: Math.floor(skip / take) + 1,
      limit: take,
      items: pagedItems,
    };
  }

  async findOne(bookId: string): Promise<BookInterface> {
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException(
        'Invalid bookId format. Must be a 24-character hex string.',
      );
    }

    const objectId = new ObjectId(bookId);
    const book = await this.bookRepository.findOneBy({ _id: objectId });
    if (!book) {
      throw new NotFoundException(`Bood with id ${bookId} not found`);
    }
    return this.mapToInterface(book);
  }

  async findManyByIds(ids: string[]): Promise<Map<string, BookEntity>> {
    const objIds = ids.filter(Boolean).map((id) => new ObjectId(id));
    if (objIds.length === 0) return new Map();

    const rows = await this.bookRepository.find({
      where: { _id: { $in: objIds } as any },
    });

    const m = new Map<string, BookEntity>();
    for (const b of rows) m.set(b._id.toHexString(), b);
    return m;
  }

  async findByTitle(bookTitle: string): Promise<BookInterface> {
    const book = await this.bookRepository.findOneBy({ title: bookTitle });
    if (!book) {
      throw new NotFoundException(`Book with title "${bookTitle}" not fouund`);
    }
    return this.mapToInterface(book);
  }

  async searchSuggest(q: string, limit = 10): Promise<string[]> {
    if (!q || !q.trim()) return [];

    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escape(q.trim()), 'i');

    const rows = await this.bookRepository.find({
      where: { title: re } as any,

      take: limit * 3,
    });

    const candidates: string[] = [];
    for (const r of rows) {
      if (r.title) candidates.push(r.title);
      //if (r.author) candidates.push(r.author);
    }

    const needle = q.toLowerCase();
    const unique = Array.from(new Set(candidates));
    unique.sort((a, b) => {
      const as = a.toLowerCase().startsWith(needle) ? 1 : 0;
      const bs = b.toLowerCase().startsWith(needle) ? 1 : 0;
      return bs - as || a.localeCompare(b);
    });

    return unique.slice(0, limit);
  }

  async create(createBookDto: CreateBookDto): Promise<BookInterface> {
    const book = this.bookRepository.create({
      ...createBookDto,
      publicationDate: toUtcMidnight(createBookDto.publicationDate),
    });
    try {
      await this.bookRepository.save(book);

      // 신규 책 등록 이벤트 발행 (제목+저자 매칭용)
      this.eventEmitter.emit('book.registered', {
        bookId: book._id?.toHexString?.() ?? String(book._id),
        type: 'NEW',
        title: book.title,
        author: book.author,
        image: book.bookPic,
        priceRent: book.priceRent,
        priceOwn: book.priceOwn,
        priceOriginal: book.priceOriginal,
        pricePaper: book.pricePaper,
        ownDiscount: book.ownDiscount,
        rentDiscount: book.rentDiscount,
      });

      return this.mapToInterface(book);
    } catch (error: any) {
      // TODO : has to define error type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const code = error.code ?? error.driverError?.code;
      if (code === 11000) {
        throw new ConflictException('Same book already exists');
      }
      throw error;
    }
  }

  async delete(bookId: string): Promise<{ message: string }> {
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException(
        'Invalid bookId format. Must be a 24-character hex string',
      );
    }
    const objectId = new ObjectId(bookId);
    const result = await this.bookRepository.delete({ _id: objectId });

    if (result.affected === 0) {
      throw new NotFoundException(`Book with id ${bookId} not found`);
    }

    return { message: `Book with id ${bookId} deleted successfully` };
  }

  //최근 인기 책 리스트
  async popularRecent(params?: {
    sinceDays?: number;
    limit?: number;
    category?: string;
  }): Promise<BookInterface[]> {
    const sinceDays = Math.max(1, Number(params?.sinceDays ?? 30));
    const limit = Math.max(1, Number(params?.limit ?? 20));
    const category = params?.category?.trim();

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);

    // 1) 기간 내 NEW 거래 상위 bookId 집계
    const top = await this.dealsService.getTopNewDealCounts(
      sinceDate,
      limit * 2,
    );
    if (top.length === 0) return [];

    const topIds = top.map((t) => t.bookId);
    const countMap = new Map(top.map((t) => [t.bookId, t.cnt]));

    // 2) 해당 책 메타 조회 (NEW 책만, 선택적으로 category 필터)
    const where: any = {
      type: BookType.NEW,
      _id: { $in: topIds.map((id) => new ObjectId(id)) } as any,
    };
    if (category) where.category = category;

    const books = await this.bookRepository.find({ where });

    // 3) 응답 구성 (bookDealCount 주입) + 정렬(거래수 desc, 출간일 desc)
    const result: BookInterface[] = books.map((b) => ({
      ...this.mapToInterface(b),
      bookDealCount: countMap.get(b._id.toHexString()) ?? 0,
    }));

    result.sort((a, b) => {
      const ac = (a as any).bookDealCount ?? 0;
      const bc = (b as any).bookDealCount ?? 0;
      if (bc !== ac) return bc - ac;
      const ad = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
      const bd = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
      return bd - ad;
    });

    return result.slice(0, limit);
  }

  async add(data: {
    book: {
      title: string;
      author: string;
      publisher: string;
      priceRent: number;
      priceOwn: number;
      priceOriginal: number;
      pricePaper: number;
      bookPic: string;
      category: string;
      totalTime: number;
      publicationDate: string;
      detail: string;
      tableOfContents: string;
      isbn: string;
      isbnPaper: string;
      page: number;
      cdnUrl: string;
    };
    subscription: boolean;
  }): Promise<BookEntity | void> {
    const book = data.book;
    const exists = await this.bookRepository.findOneBy({
      title: book.title,
    });
    if (exists) {
      return;
    }
    const rentDiscount =
      Math.round((1 - book.priceRent / book.priceOriginal) * 100) / 100;
    const ownDiscount =
      Math.round((1 - book.priceOwn / book.priceOriginal) * 100) / 100;
    const newBook = this.bookRepository.create({
      ...book,
      publicationDate: new Date(book.publicationDate),
      priceRent: data.subscription ? 0 : book.priceRent,
      rentDiscount: data.subscription ? 0 : rentDiscount,
      ownDiscount,
      encCdnUrl: `${book.cdnUrl}.enc`,
      type: BookType.NEW,
    });
    await this.bookRepository.save(newBook);
    return newBook;
  }

  private mapToInterface(entity: BookEntity): BookInterface {
    const pubDate = entity.publicationDate;
    const yyyyMmDd = pubDate
      ? new Date(pubDate).toISOString().slice(0, 10)
      : null;
    return {
      id: entity._id.toHexString(),
      title: entity.title,
      author: entity.author,
      publisher: entity.publisher,
      priceRent: entity.priceRent,
      priceOwn: entity.priceOwn,
      priceOriginal: entity.priceOriginal,
      pricePaper: entity.pricePaper,
      bookPic: entity.bookPic,
      category: entity.category,
      totalTime: entity.totalTime,
      publicationDate: yyyyMmDd as any,
      detail: entity.detail,
      tableOfContents: entity.tableOfContents,
      publisherReview: entity.publisherReview,
      isbn: entity.isbn,
      isbnPaper: entity.isbnPaper,
      page: entity.page,
      type: entity.type,
      cdnUrl: entity.cdnUrl,
      encCdnUrl: entity.encCdnUrl,
      ownDiscount: entity.ownDiscount,
      rentDiscount: entity.rentDiscount,
    };
  }
}
