import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NoticeInterestsService } from 'src/alerts/services/notice-interests';
import { BooksService } from 'src/books/service/book.service';
import { ObjectId } from 'mongodb';

type DealRegisteredEvent = {
  bookId?: string;
  dealId: string;
  buyerId?: string; // ← 추가
  sellerId?: string;
  type: 'NEW' | 'OLD';
  title?: string;
  author?: string;
  image?: string;
  price?: number;
  category?: 'BOOK' | 'COIN';
};

@Injectable()
export class DealsRegisteredListener {
  private readonly logger = new Logger(DealsRegisteredListener.name);

  constructor(
    private readonly notices: NoticeInterestsService,
    private readonly books: BooksService,
  ) {}

  @OnEvent('deal.registered', { async: true })
  async handleDealRegistered(payload: DealRegisteredEvent) {
    try {
      // 1) book 정보 확보(가능하면 DB에서)
      let book: {
        _id?: any;
        isbn13?: string;
        title?: string;
        author?: string;
      } | null = null;

      if (payload.bookId && ObjectId.isValid(payload.bookId)) {
        try {
          const found = await this.books.findOne(payload.bookId);
          if (found) {
            book = {
              _id: new ObjectId(payload.bookId),
              isbn13: (found as any).isbn13,
              title: found.title,
              author: found.author,
            };
          }
        } catch {
          /* 책이 없으면 아래 title/author 키로만 진행 */
        }
      }

      // bookId가 없거나 책 조회가 실패하면 이벤트에 담긴 title/author로 키 매칭
      if (!book) {
        book = {
          _id: undefined,
          isbn13: undefined,
          title: payload.title,
          author: payload.author,
        };
      }

      const bookTitle = book?.title ?? payload.title ?? '';
      const bookAuthor = book?.author ?? payload.author ?? '';
      const dealType = payload.type;

      // 2) 구독자 조회(기존 bookId 기반 + 신규 bookKey 기반 모두 매칭)
      const subs = await this.notices.findSubscribersByTitleAuthor(
        bookTitle,
        bookAuthor,
        dealType,
      );

      // 3) 알림 발송 (여기서 실제 알림/푸시/이메일 등 호출)
      //    예: NotificationService.send(...)
      // for (const s of subs) { ... }

      // 4) pending 구독(bookKey만 있는 항목)에 bookId 연결(선택)
      if (payload.bookId && ObjectId.isValid(payload.bookId)) {
        for (const r of subs) {
          if (!r.bookId) {
            r.bookId = new ObjectId(payload.bookId);
            // NoticeInterestsService 안에 repo가 있으니, 작은 헬퍼를 만들어 저장하거나
            // r.updatedAt = new Date(); 정도 갱신 후 save
            await (this.notices as any).repo.save(r);
          }
        }
      }

      this.logger.log(
        `deal.registered handled: dealId=${payload.dealId}, matchedSubs=${subs.length}`,
      );
    } catch (err) {
      this.logger.error('handleDealRegistered error', err?.stack || err);
    }
  }
}
