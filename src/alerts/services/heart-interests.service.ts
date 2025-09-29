import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeartInterestEntity } from '../entities/heart-interest.entity';
import { ObjectId } from 'mongodb';
import { BookEntity } from 'src/books/entities/book.entity';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}
export type BookStatus = 'owned' | 'listed' | 'expired';

@Injectable()
export class HeartInterestsService {
  constructor(
    @InjectRepository(HeartInterestEntity)
    private readonly repo: Repository<HeartInterestEntity>,
    @InjectRepository(BookEntity)
    private readonly books: Repository<BookEntity>,
    @InjectRepository(UserBooksEntity)
    private readonly userBooks: Repository<UserBooksEntity>,
  ) {}

  private hex(id: ObjectId) {
    return id.toHexString();
  }

  async upsertHeart(userId: string, bookId: string, on: boolean) {
    const u = asObjectId(userId, 'userId');
    const b = asObjectId(bookId, 'bookId');

    if (!on) {
      await this.repo.delete({ userId: u, bookId: b } as any);
      return null;
    }

    // 책 존재 검증
    const exists = await this.books.findOne({ where: { _id: b } as any });
    if (!exists) throw new BadRequestException('bookId not found');

    const now = new Date();
    const row =
      (await this.repo.findOne({ where: { userId: u, bookId: b } })) ??
      this.repo.create({ userId: u, bookId: b, createdAt: now });

    row.heart = true;
    row.heartedAt = now;
    row.updatedAt = now;
    return this.repo.save(row);
  }

  async list(userId: string, page = 1, take = 20) {
    const u = asObjectId(userId, 'userId');

    // 1) heart rows
    const [rows, total] = await this.repo.findAndCount({
      where: { userId: u },
      order: { heartedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });

    if (rows.length === 0) return { items: [], page, total };

    // 2) bookIds 모아서 배치 조회
    const bookIdsObj: ObjectId[] = rows.map((r) =>
      r.bookId instanceof ObjectId
        ? r.bookId
        : asObjectId(r.bookId as any, 'bookId'),
    );

    const [books, myBookLinks] = await Promise.all([
      this.books.find({
        where: { _id: { $in: bookIdsObj } } as any,
      }),

      this.userBooks.find({
        where: { userId: u, bookId: { $in: bookIdsObj } } as any,
      }),
    ]);

    // 3) 머지
    const bookById = new Map(books.map((b) => [this.hex(b._id), b]));
    const statusByBookId = new Map<string, BookStatus>();
    for (const link of myBookLinks) {
      const key = this.hex(link.bookId);

      const s = (link as any).book_status;
      statusByBookId.set(key, s as BookStatus) ?? 'listed';
    }

    const items = rows.map((r) => {
      const key = this.hex(r.bookId);
      const b = bookById.get(key);
      const status = statusByBookId.get(key) ?? 'listed';
      return {
        heartId: this.hex(r._id),
        heartedAt: r.heartedAt,
        book: b
          ? {
              id: this.hex(b._id),
              title: b.title,
              author: b.author,
              publisher: b.publisher,
              coverUrl: b.bookPic,
              priceRent: b.priceRent,
              priceOwn: b.priceOwn,
            }
          : null,
        bookStatus: status,
      };
    });
    return { items, page, total };
  }
}
