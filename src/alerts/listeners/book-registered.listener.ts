import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NoticeInterestsService } from '../services/notice-interests';
import { NotificationsService } from '../services/notifications.service';

@Injectable()
export class BookRegisteredListener {
  constructor(
    private readonly notices: NoticeInterestsService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('book.registered', { async: true })
  async handle(e: {
    bookId: string;
    dealId?: string;
    sellerId?: string;
    type: 'NEW' | 'OLD';
    title: string;
    author?: string;
    image?: string;
    price?: number | string;
  }) {
    const subs = await this.notices.findSubscribers(e.bookId, e.type);
    for (const sub of subs) {
      const toUserId = (sub.userId as any).toHexString
        ? (sub.userId as any).toHexString()
        : String(sub.userId);
      if (e.sellerId && toUserId === e.sellerId) continue;
      await this.notifications.pushBookListed(toUserId, {
        bookId: e.bookId,
        dealId: e.dealId,
        title: e.title,
        author: e.author,
        image: e.image,
        price: e.price,
      });
    }
  }
}
