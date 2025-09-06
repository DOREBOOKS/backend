// listeners/book-or-deal-registered.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NoticeInterestsService } from '../services/notice-interests';
import { NotificationsService } from '../services/notifications.service';

type Evt = {
  bookId?: string;
  dealId?: string;
  sellerId?: string;
  type: 'NEW' | 'OLD';
  title: string;
  author?: string;
  image?: string;
  price?: number | string;
};

@Injectable()
export class BookOrDealRegisteredListener {
  private readonly logger = new Logger(BookOrDealRegisteredListener.name);

  constructor(
    private readonly notices: NoticeInterestsService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('book.registered', { async: true })
  async onBook(e: Evt) {
    await this.handle(e);
  }

  @OnEvent('deal.registered', { async: true })
  async onDeal(e: Evt) {
    await this.handle(e);
  }

  private async handle(e: Evt) {
    // 제목+저자 매칭으로 구독자 조회(이미 구현됨)
    const subs = await this.notices.findSubscribersByTitleAuthor(
      e.title,
      e.author ?? '',
      e.type,
    );

    for (const sub of subs) {
      const toUserId =
        (sub.userId as any)?.toHexString?.() ?? String(sub.userId);

      if (e.sellerId && toUserId === e.sellerId) continue; // 본인 제외

      const kind: 'NEW_LISTED' | 'OLD_LISTED' = (sub as any).bookId
        ? 'OLD_LISTED'
        : 'NEW_LISTED';

      await this.notifications.pushListed(
        toUserId,
        {
          bookId: e.bookId ?? '',
          dealId: e.dealId,
          title: e.title,
          author: e.author,
          image: e.image,
          price: e.price,
        },
        kind,
      );
    }

    this.logger.log(
      `notify ${subs.length} subs for "${e.title}" | "${e.author}" (event=${e.type})`,
    );
  }
}
