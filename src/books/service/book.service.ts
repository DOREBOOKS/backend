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
import { BookInterface } from '../interfaces/book.interface';
import { ObjectId } from 'mongodb';
import { BookStatus } from '../entities/book.entity';
import { BookType } from '../entities/book.entity';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { Type as DealType } from 'src/deal/entity/deals.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity)
    private readonly bookRepository: Repository<BookEntity>,

    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
  }): Promise<BookInterface[]> {
    const { category, sort } = options;

    //기본 조건
    const where: any = { type: BookType.NEW };
    if (category) where.category = category;

    //정렬 조건
    const order: any = {};
    if (sort === 'popular') {
      order.popularity = 'DESC';
    } else if (sort === 'recent') {
      order.createdAt = 'DESC';
    }

    //1. 신규 도서만 조회
    const newBooks = await this.bookRepository.find({ where, order });

    //2. 각 신규도서에 연결된 중고 도서 정보 붙이기
    const result = await Promise.all(
      newBooks.map(async (book) => {
        const oldBooks = await this.dealsRepository.find({
          where: {
            title: book.title,
            type: DealType.OLD,
          },
        });

        const books = oldBooks.map((deal) => ({
          dealId: deal.dealId,
          price: Number(deal.price),
          date: deal.registerDate,
          remainTime: deal.remainTime,
        }));

        return {
          ...this.mapToInterface(book),
          old: {
            count: books.length,
            books,
          },
        };
      }),
    );

    // //3. 웅답에서 type 필드 제거
    // return result.map(({ type, ...rest }) => rest);
    return result;
  }

  async getOldBookStatsByTitle(title: string) {
    const oldBooks = await this.dealsRepository.find({
      where: {
        title,
        type: DealType.OLD,
      },
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

  async findByTitle(bookTitle: string): Promise<BookInterface> {
    const book = await this.bookRepository.findOneBy({ title: bookTitle });
    if (!book) {
      throw new NotFoundException(`Book with title "${bookTitle}" not fouund`);
    }
    return this.mapToInterface(book);
  }

  async create(createBookDto: CreateBookDto): Promise<BookInterface> {
    const book = this.bookRepository.create(createBookDto);
    try {
      await this.bookRepository.save(book);
      return this.mapToInterface(book);
    } catch (error: any) {
      // TODO : has to define error type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
      price: entity.price,
      book_pic: entity.book_pic,
      category: entity.category,
      total_time: entity.total_time,
      //status: entity.status,
      detail: entity.detail,
      tableOfContents: entity.tableOfContents,
      publisherReview: entity.publisherReview,
      isbn: entity.isbn,
      page: entity.page,
      type: entity.type,
    };
  }
}
