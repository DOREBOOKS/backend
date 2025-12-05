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

    // bookId resolve
    if (!bookId) {
      const book = await this.bookRepo.findOne({
        where: { title: keyword } as any,
      });
      if (!book)
        throw new BadRequestException('book not found by title; pass bookId');
      bookId = book._id.toHexString();
      bookTitle = book.title;
    } else {
      if (!ObjectId.isValid(bookId))
        throw new BadRequestException('Invalid bookId format');
      const exists = await this.bookRepo.findOne({
        where: { _id: new ObjectId(bookId) } as any,
      });
      if (!exists) throw new BadRequestException('book not found');
      if (!bookTitle) bookTitle = exists.title;
    }

    // 키워드 단일화: upsert로 최신화 (createdAt 포함)
    await this.searchRepo.updateOne(
      { userId, keyword } as any,
      {
        $set: {
          userId,
          keyword,
          bookId,
          bookTitle,
          source: 'suggest-click',
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    // 리스트 cap: 최근 20개 유지 (userId별 createdAt 오름차순으로 오래된 것 삭제)
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

  // 최근 검색어 목록
  async recentSuggestClicks(userId: string, limit = 10) {
    const rows = await this.searchRepo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return rows.map((r) => ({
      keyword: r.keyword,
      bookId: r.bookId,
      bookTitle: r.bookTitle,
      createdAt: r.createdAt,
    }));
  }

  async deleteByKeyword(
    userId: string,
    keyword: string,
  ): Promise<{ deletedCount: number }> {
    const k = keyword?.trim();
    if (!k) throw new BadRequestException('keyword is required');

    const res = await this.searchRepo.deleteMany({ userId, keyword: k } as any);
    return { deletedCount: (res as any)?.deletedCount ?? 0 };
  }
}
