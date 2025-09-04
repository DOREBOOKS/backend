import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoticeInterestEntity } from '../entities/notice-interest';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';

export type NoticeType = 'ANY' | 'NEW' | 'OLD';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}

@Injectable()
export class NoticeInterestsService {
  constructor(
    @InjectRepository(NoticeInterestEntity)
    private readonly repo: Repository<NoticeInterestEntity>,
  ) {}

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
    const now = new Date();
    const row =
      (await this.repo.findOne({ where: { userId: u, bookId: b } })) ??
      this.repo.create({ userId: u, bookId: b, createdAt: now });
    row.notice = true;
    row.noticeType = noticeType;
    row.noticedAt = now;
    row.updatedAt = now;
    return this.repo.save(row);
  }

  async list(userId: string) {
    const u = asObjectId(userId, 'userId');
    return this.repo.find({
      where: { userId: u },
      order: { noticedAt: 'DESC' },
    });
  }

  // 매물 등록 시 구독자 조회
  findSubscribers(bookId: string, dealType: 'NEW' | 'OLD') {
    const b = asObjectId(bookId, 'bookId');
    return this.repo.find({
      where: [
        { bookId: b, notice: true, noticeType: 'ANY' as any },
        { bookId: b, notice: true, noticeType: dealType as any },
      ],
    });
  }
}
