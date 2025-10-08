import {
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
import { BookInterface, OldDeal } from '../interfaces/book.interface';
import { ObjectId } from 'mongodb';
import { BookStatus } from '../entities/book.entity';
import { BookType } from '../entities/book.entity';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { Type as DealType, DealStatus } from 'src/deal/entity/deals.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,

    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,

    private readonly eventEmitter: EventEmitter2,
  ) {}

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

  //최근 등록된 중고 매물 리스트
  async oldRecent(limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);

    // 1) 최근 중고 매물 조회
    const deals = await this.dealsRepository.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
      } as any,
      order: { registerDate: 'DESC' },
      take,
    });

    if (deals.length === 0) return { items: [], total: 0 };

    // 2) bookId 수집 → books 배치 조회 (title로 매칭하지 않음)
    const bookIdSet = new Set<string>();
    for (const d of deals) {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));
      if (bid) bookIdSet.add(bid);
    }

    const objIds = Array.from(bookIdSet).map((id) => new ObjectId(id));
    const books = await this.bookRepository.find({
      where: { _id: { $in: objIds } as any },
    });

    const bookById = new Map(books.map((b) => [b._id.toHexString(), b]));

    // 3) 병합 후 반환 (메타는 항상 books 기준)
    const items = deals.map((d) => {
      const bid =
        typeof d.bookId === 'string'
          ? d.bookId
          : ((d.bookId as any)?.toHexString?.() ?? String(d.bookId ?? ''));
      const b = bid ? bookById.get(bid) : undefined;

      const dealId =
        (d as any)?._id?.toHexString?.() ?? String((d as any)?._id ?? '');

      return {
        // 표시용 메타는 books에서
        title: b?.title ?? '',
        price: Number(d.price),
        registeredDate: d.registerDate,

        originalPriceRent: d.originalPriceRent ?? b?.priceRent ?? null,
        originalPriceOwn: d.originalPriceOwn ?? b?.priceOwn ?? null,

        // book 정보 (없으면 null)
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

  async findAll(): Promise<BookInterface[]> {
    const books = await this.bookRepository.find();
    return books.map((book) => this.mapToInterface(book));
  }

  async findBooks(options: {
    category?: string;
    sort?: string;
    id?: string;
  }): Promise<BookInterface | BookInterface[]> {
    const { id, category, sort } = options;

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

      const oldBooks = await this.dealsRepository.find({
        where: {
          bookId: book._id.toHexString(),
          type: DealType.OLD,
          status: DealStatus.LISTING,
          $or: [{ buyerId: null }, { buyerId: { $exists: false } }],
        } as any,
      });

      const books: OldDeal[] = oldBooks.map((deal) => ({
        dealId: String(deal._id),
        sellerId: (deal.sellerId as ObjectId).toHexString(),
        price: Number(deal.price),
        date: deal.registerDate,
        remainTime: deal.remainTime,
        goodPoints: Array.isArray((deal as any).goodPoints)
          ? (deal as any).goodPoints
          : [],
        originalPriceRent: deal.originalPriceRent ?? book.priceRent,
        originalPriceOwn: deal.originalPriceOwn ?? book.priceOwn,
      }));

      return {
        ...this.mapToInterface(book),
        old: { count: books.length, books },
      };
    }

    const where: any = { type: BookType.NEW };
    if (category) where.category = category;

    const order: any = {};
    if (sort === 'popular') order.popularity = 'DESC';
    else if (sort === 'recent') order.createdAt = 'DESC';

    const newBooks = await this.bookRepository.find({ where, order });

    const result: BookInterface[] = await Promise.all(
      newBooks.map(async (book) => {
        const oldBooks = await this.dealsRepository.find({
          where: {
            type: DealType.OLD,
            status: DealStatus.LISTING,
            // bookId가 문자열/객체 혼재 가능성 방어
            $or: [
              { bookId: book._id.toHexString() },
              { bookId: new ObjectId(book._id) as any },
            ],
            // buyerId null/미존재 모두 허용
            $and: [
              { $or: [{ buyerId: null }, { buyerId: { $exists: false } }] },
            ],
          } as any,
        });

        const books: OldDeal[] = oldBooks.map((deal) => ({
          dealId: String(deal._id),
          sellerId: (deal.sellerId as ObjectId).toHexString(),
          price: Number(deal.price),
          date: deal.registerDate,
          remainTime: deal.remainTime,
          goodPoints: Array.isArray((deal as any).goodPoints)
            ? (deal as any).goodPoints
            : [],
        }));

        return {
          ...this.mapToInterface(book),
          old: { count: books.length, books },
        };
      }),
    );

    return result;
  }

  async getOldBookStatsByTitle(id: string) {
    const oldBooks = await this.dealsRepository.find({
      where: {
        type: DealType.OLD,
        status: DealStatus.LISTING,
        $or: [{ bookId: id }, { bookId: new ObjectId(id) as any }],
        $and: [{ $or: [{ buyerId: null }, { buyerId: { $exists: false } }] }],
      } as any,
    });

    if (oldBooks.length === 0) {
      return {
        count: 0,
        books: [],
      };
    }

    const books = oldBooks.map((deal) => ({
      bookId: deal.bookId,
      price: Number(deal.price),
      date: deal.registerDate,
    }));

    return {
      count: books.length,
      books,
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
      where: {
        $or: [{ title: re }, { author: re }],
      } as any,

      take: limit * 3,
    });

    const candidates: string[] = [];
    for (const r of rows) {
      if (r.title) candidates.push(r.title);
      if (r.author) candidates.push(r.author);
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
    const book = this.bookRepository.create(createBookDto);
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

  // async updateStatus(bookId: string): Promise<void> {
  //   await this.bookRepository.update(bookId);
  // }
  private mapToInterface(entity: BookEntity): BookInterface {
    return {
      id: entity._id.toHexString(),
      title: entity.title,
      author: entity.author,
      publisher: entity.publisher,
      priceRent: entity.priceRent,
      priceOwn: entity.priceOwn,
      bookPic: entity.bookPic,
      category: entity.category,
      totalTime: entity.totalTime,
      //status: entity.status,
      detail: entity.detail,
      tableOfContents: entity.tableOfContents,
      publisherReview: entity.publisherReview,
      isbn: entity.isbn,
      page: entity.page,
      type: entity.type,
      cdnUrl: entity.cdnUrl,
    };
  }
}
