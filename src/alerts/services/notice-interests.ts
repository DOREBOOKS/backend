import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeInterestEntity } from '../entities/notice-interest';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
import { BookEntity } from 'src/books/entities/book.entity';
import { NoticeDto } from '../dto/notice.dto';

export type NoticeType = 'ANY' | 'NEW' | 'OLD';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}

function foldKey(s?: string) {
  return (s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function taKey(title?: string, author?: string) {
  const t = foldKey(title);
  const a = foldKey(author);
  if (!t || !a) return null;
  return `ta:${t}|${a}`;
}

@Injectable()
export class NoticeInterestsService {
  constructor(
    @InjectRepository(NoticeInterestEntity)
    private readonly repo: Repository<NoticeInterestEntity>,
    @InjectRepository(BookEntity)
    private readonly books: Repository<BookEntity>,
  ) {}

  private hex(id: ObjectId) {
    return id.toHexString();
  }

  //기존 등록된 도서(bookId) 기준
  async upsertNotice(
    userId: string,
    bookId: string,
    on: boolean,
    noticeType: NoticeType = 'ANY',
  ) {
    const u = asObjectId(userId, 'userId');
    const b = asObjectId(bookId, 'bookId');

    if (!on) {
      await this.repo.delete({ userId: u, bookId: b } as any);
      return null;
    }

    const exists = await this.books.findOne({ where: { _id: b } as any });
    if (!exists) throw new BadRequestException('bookId not found');

    const key = taKey(exists.title, exists.author);
    if (!key)
      throw new BadRequestException('Cannot build key from title/author');

    const now = new Date();
    const row =
      (await this.repo.findOne({ where: { userId: u, bookId: b } })) ??
      this.repo.create({ userId: u, bookId: b, createdAt: now });

    row.bookKey = key; //  제목+저자 키 저장
    row.notice = true;
    row.noticeType = noticeType;
    row.noticedAt = now;
    row.updatedAt = now;

    // 스냅샷도 갱신
    row.title = exists.title;
    row.author = exists.author;
    row.publisher = exists.publisher;

    return this.repo.save(row);
  }

  async upsertNoticeByKey(userId: string, dto: NoticeDto) {
    const u = asObjectId(userId, 'userId');
    const on = dto.notice;
    const noticeType = dto.noticeType ?? 'ANY';

    // 취소
    if (!on) {
      const conds: any[] = [];
      if (dto.bookId) {
        try {
          conds.push({ userId: u, bookId: asObjectId(dto.bookId, 'bookId') });
        } catch {}
      }
      const key = taKey(dto.title, dto.author);
      if (key) conds.push({ userId: u, bookKey: key });
      if (!conds.length)
        throw new BadRequestException('No identifier to cancel notice');
      await this.repo.delete({ $or: conds } as any);
      return null;
    }

    // 1) 제목+저자 키 생성 (bookId가 있어도 최종 매칭은 제목+저자로)
    let key = taKey(dto.title, dto.author);
    if (!key && dto.bookId) {
      try {
        const b = asObjectId(dto.bookId, 'bookId');
        const book = await this.books.findOne({ where: { _id: b } as any });
        key = taKey(book?.title, book?.author) ?? (undefined as any);
      } catch {}
    }
    if (!key)
      throw new BadRequestException('title & author are required to subscribe');

    const now = new Date();

    // 2)  같은 userId+bookKey가 이미 있으면 그대로 갱신/반환(중복 생성 X)
    const existing = await this.repo.findOne({
      where: { userId: u, bookKey: key },
    });
    if (existing) {
      existing.notice = true;
      existing.noticeType = noticeType;
      existing.noticedAt = now;
      existing.updatedAt = now;

      // 스냅샷 비어있으면 채워넣기
      existing.title = existing.title ?? dto.title;
      existing.author = existing.author ?? dto.author;
      existing.publisher = existing.publisher ?? dto.publisher;

      // (선택) bookId가 들어왔고 기존 row에 bookId가 없으면 attach
      if (!existing.bookId && dto.bookId && ObjectId.isValid(dto.bookId)) {
        (existing as any).bookId = new ObjectId(dto.bookId);
      }

      return this.repo.save(existing); // 중복 없이 종료
    }

    // 3) 신규 생성
    const row = this.repo.create({
      userId: u,
      bookKey: key,
      notice: true,
      noticeType,
      noticedAt: now,
      createdAt: now,
      updatedAt: now,
      // snapshot
      title: dto.title,
      author: dto.author,
      publisher: dto.publisher,
    });

    // pending에서는 bookId 제거
    if ((row as any).bookId === null || (row as any).bookId === undefined) {
      delete (row as any).bookId;
    }

    return this.repo.save(row);
  }

  //알림 등록 도서 목록
  async list(userId: string, page = 1, take = 20) {
    const u = asObjectId(userId, 'userId');

    // 1) 알림 rows
    const [rows, total] = await this.repo.findAndCount({
      where: { userId: u },
      order: { noticedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });

    if (rows.length === 0) return { items: [], page, total };

    //2) bookIds 모아 배치 조회
    const bookIdsObj: ObjectId[] = [];
    for (const r of rows) {
      const bid = (r as any).bookId;
      if (!bid) continue; // pending(미등록) 알림은 건너뜀
      if (bid instanceof ObjectId) {
        bookIdsObj.push(bid);
      } else if (typeof bid === 'string' && ObjectId.isValid(bid)) {
        bookIdsObj.push(new ObjectId(bid));
      }
    }

    const bookList = bookIdsObj.length
      ? await this.books.find({ where: { _id: { $in: bookIdsObj } } as any })
      : [];

    //3) 머지
    const byId = new Map(bookList.map((b) => [this.hex(b._id), b]));

    const items = rows.map((r) => {
      if (r.bookId) {
        const b = byId.get(this.hex(r.bookId as ObjectId));
        return {
          noticeId: this.hex(r._id),
          noticedAt: r.noticedAt,
          noticeType: r.noticeType,
          book: b
            ? {
                id: this.hex(b._id),
                title: b.title,
                author: b.author,
                publisher: b.publisher,
                coverUrl: (b as any).book_pic,
                price: b.price,
              }
            : null,
          pending: false,
        };
      }

      return {
        noticeId: this.hex(r._id),
        noticedAt: r.noticedAt,
        noticeType: r.noticeType,
        book: null,
        pending: true,
        snapshot: {
          isbn: r.isbn,
          title: r.title,
          author: r.author,
          publisher: r.publisher,
        },
      };
    });
    return { items, page, total };
  }

  async findSubscribersByTitleAuthor(
    title: string,
    author: string,
    dealType: 'NEW' | 'OLD',
  ) {
    const key = taKey(title, author);
    if (!key) return [];
    return this.repo.find({
      where: {
        $or: [
          { bookKey: key, notice: true, noticeType: 'ANY' as any },
          { bookKey: key, notice: true, noticeType: dealType as any },
        ],
      } as any,
    });
  }

  // 매물 등록 시 구독자 조회
  findSubscribers(_bookId: string, _dealType: 'NEW' | 'OLD') {
    return Promise.resolve([]); // 혹은 기존 메서드 유지하되 Listener에서 호출하지 않음
  }

  //noticeId로 알림 취소
  async cancelByNoticeId(userId: string, noticeId: string) {
    const u = asObjectId(userId, 'userId');
    const n = asObjectId(noticeId, 'noticeId');
    const response = await this.repo.delete({
      _id: n,
      userId: u,
    } as any);
    const deleted =
      (response as any).affected ?? (response as any).raw?.deletedCount ?? 0;
    if (!deleted) {
      return { deleted: 0 };
    }
    return { deleted };
  }
}
