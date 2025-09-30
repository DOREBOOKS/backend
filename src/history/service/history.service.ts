import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { SearchHistoryEntity } from '../entities/search-history.entity';
import { BookEntity } from 'src/books/entities/book.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(SearchHistoryEntity)
    private readonly searchRepo: MongoRepository<SearchHistoryEntity>,
    @InjectRepository(BookEntity)
    private readonly bookRepo: Repository<BookEntity>,
  ) {}

  // 제안어 클릭 저장 (상세 이동 확정 시 호출)
  async saveSuggestClick(
    userId: string,
    params: { keyword: string; bookId?: string; bookTitle?: string },
  ) {
    const keyword = params.keyword?.trim();
    if (!keyword) throw new BadRequestException('keyword is required');

    let bookId = params.bookId?.trim();
    let bookTitle = params.bookTitle?.trim();

    // bookId가 없으면 제목으로 resolve
    if (!bookId) {
      const book = await this.bookRepo.findOne({
        where: { title: keyword } as any, // 제목 고유라고 가정(아닌 경우는 프론트가 bookId를 넘겨줘야 정확)
      });
      if (!book)
        throw new BadRequestException('book not found by title; pass bookId');
      bookId = book._id.toHexString();
      bookTitle = book.title;
    } else {
      // 형식 체크 + 존재 검증(선택이지만 추천)
      if (!ObjectId.isValid(bookId))
        throw new BadRequestException('Invalid bookId format');
      const exists = await this.bookRepo.findOne({
        where: { _id: new ObjectId(bookId) } as any,
      });
      if (!exists) throw new BadRequestException('book not found');
      if (!bookTitle) bookTitle = exists.title;
    }

    // 중복 방지 정책:
    // 1) 같은 유저가 동일 bookId를 최근 기록에 여러 번 쌓지 않도록 기존 항목 삭제
    await this.searchRepo.deleteMany({ userId, bookId });

    // 2) 저장
    const doc = this.searchRepo.create({
      userId,
      keyword,
      bookId,
      bookTitle,
      source: 'suggest-click',
      createdAt: new Date(),
    });
    await this.searchRepo.save(doc);

    // 3) 리스트 cap: 최근 20개만 유지
    const count = await this.searchRepo.count({ where: { userId } as any });
    if (count > 20) {
      const overflow = count - 20;
      const oldOnes = await this.searchRepo.find({
        where: { userId } as any,
        order: { createdAt: 'ASC' },
        take: overflow,
      });
      if (oldOnes.length) {
        await this.searchRepo.deleteMany({
          _id: { $in: oldOnes.map((o) => o._id) } as any,
        } as any);
      }
    }

    return { ok: true };
  }

  // 최근 검색어 목록 (최근 → 과거, 프론트에서 아이템 탭 시 바로 상세로 이동 가능)
  async recentSuggestClicks(userId: string, limit = 10) {
    const rows = await this.searchRepo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    // 프론트에서 곧바로 상세로 이동할 수 있도록 bookId 포함 반환
    return rows.map((r) => ({
      keyword: r.keyword,
      bookId: r.bookId,
      bookTitle: r.bookTitle,
      createdAt: r.createdAt,
    }));
  }
}
