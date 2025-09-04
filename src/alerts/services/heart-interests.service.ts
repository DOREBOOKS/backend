import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeartInterestEntity } from '../entities/heart-interest.entity';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
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
    @InjectRepository(UserBooksEntity)
    private readonly userBooks: Repository<UserBooksEntity>,
  ) {}

  async upsertHeart(userId: string, bookId: string, on: boolean) {
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
    row.heart = true;
    row.heartedAt = now;
    row.updatedAt = now;
    return this.repo.save(row);
  }

  async list(userId: string) {
    const u = asObjectId(userId, 'userId');
    const rows = await this.repo.find({
      where: { userId: u },
      order: { heartedAt: 'DESC' },
    });

    const withStatus = await Promise.all(
      rows.map(async (r) => {
        const userBook = await this.userBooks.findOne({
          where: { userId: u, bookId: r.bookId },
        });

        return {
          ...r,
          title: userBook?.title,
          author: userBook?.author,
          publisher: userBook?.publisher,
          image: userBook?.image,
          book_status: userBook?.book_status ?? 'listed', // 있으면 book_status, 없으면 listed
        };
      }),
    );
    return withStatus;
  }
}
