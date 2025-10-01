import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';
import { ObjectId } from 'mongodb';
import { FcmService } from './fcm.service';
import { DevicesService } from './devices.service';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}

type ListedKind = 'NEW_LISTED' | 'OLD_LISTED';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notiRepo: Repository<NotificationEntity>,
    private readonly fcm: FcmService,
    private readonly devices: DevicesService,
  ) {}

  // 공통 구현: kind로 신규/중고 분기
  async pushListed(
    toUserId: string,
    data: {
      bookId?: string; // 신규 알림일 땐 없을 수 있음
      dealId?: string;
      title: string;
      author?: string;
      image?: string;
      price?: number | string;
    },
    kind: ListedKind,
  ) {
    const isNew = kind === 'NEW_LISTED';
    const row = this.notiRepo.create({
      userId: asObjectId(toUserId, 'userId'),
      kind,
      title: isNew ? '신규매물 등록 알림' : '중고매물 등록 알림',
      message: isNew
        ? `${data.title}의 새 책이 등록되었어요.`
        : `${data.title} 중고 매물이 등록되었어요.`,
      payload: {
        bookId: data.bookId ?? '',
        dealId: data.dealId,
        image: data.image,
        author: data.author,
        price: data.price,
        listedType: isNew ? 'NEW' : 'OLD',
      },
      isRead: false,
      createdAt: new Date(),
    });
    await this.notiRepo.save(row);

    //2.FCM 발송
    const tokens = await this.devices.getTokens(toUserId);
    for (const t of tokens) {
      await this.fcm.sendToToken(t, {
        title: row.title,
        body: row.message,
        route: 'BookDetail',
        id: data.bookId ?? data.dealId,
      });
    }

    return row;
  }

  // 하위호환용: 기존 호출부가 있으면 '중고'로 처리
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
    return this.pushListed(toUserId, data, 'OLD_LISTED');
  }

  list(userId: string, isRead?: boolean, limit = 50) {
    const u = asObjectId(userId, 'userId');

    const where: any = { userId: u };
    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }

    const order =
      typeof isRead === 'boolean'
        ? { createdAt: 'DESC' as const }
        : { isRead: 'ASC' as const, createdAt: 'DESC' as const };

    return this.notiRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(userId: string, notiId: string) {
    const row = await this.notiRepo.findOne({
      where: {
        _id: asObjectId(notiId, 'notiId'),
        userId: asObjectId(userId, 'userId'),
      },
    });
    if (!row) return;
    row.isRead = true;
    return this.notiRepo.save(row);
  }
}
