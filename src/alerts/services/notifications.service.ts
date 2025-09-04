import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notiRepo: Repository<NotificationEntity>,
  ) {}

  async pushBookListed(
    toUserId: string,
    data: {
      bookId: string;
      dealId?: string;
      title: string;
      author?: string;
      image?: string;
      price?: number | string;
    },
  ) {
    const row = this.notiRepo.create({
      userId: new ObjectId(toUserId),
      kind: 'BOOK_LISTED',
      title: '중고매물 등록 알림',
      message: `${data.title}이(가) 등록되었어요.`,
      payload: {
        bookId: data.bookId,
        dealId: data.dealId,
        image: data.image,
        author: data.author,
        price: data.price,
      },
      isRead: false,
      createdAt: new Date(),
    });
    return this.notiRepo.save(row);
  }

  list(userId: string, unreadOnly = false, limit = 50) {
    const u = asObjectId(userId, 'userId');
    return this.notiRepo.find({
      where: { userId: u, ...(unreadOnly ? { isRead: false } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    return this.notiRepo.count({
      where: { userId: new ObjectId(userId), isRead: false },
    });
  }

  async markRead(userId: string, notiId: string) {
    const row = await this.notiRepo.findOne({
      where: { _id: new ObjectId(notiId), userId: new ObjectId(userId) },
    });
    if (!row) return;
    row.isRead = true;
    return this.notiRepo.save(row);
  }
}
