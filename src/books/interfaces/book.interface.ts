import { BookType } from '../entities/book.entity';

// export interface OldDeal {
//   dealId: string;
//   sellerId?: string;
//   price: number;
//   date: Date;
//   remainTime: number;
//   goodPoints?: string[];
//   comment?: string;
//   priceRent?: number | null;
//   priceOwn?: number | null;
//   sellerName?: string;
// }

// export interface OldInfo {
//   count: number;
//   books: OldDeal[];
// }

export interface BookInterface {
  id: string;
  title: string;
  author: string;
  publisher: string;
  priceRent: number;
  priceOwn: number;
  priceOriginal: number;
  pricePaper: number;
  bookPic: string;
  category: string;
  totalTime: number;
  publicationDate: Date;
  detail: string;
  tableOfContents: string;
  publisherReview: string;
  isbn: string;
  isbnPaper: string;
  page: number;
  type: BookType;
  cdnUrl: string;
  encCdnUrl: string;
  ownDiscount?: number;
  rentDiscount?: number;
  reviewCount?: number;
  bookDealCount?: number;
  audioBookEnabled: boolean;
  maxTransferCount: number;
}
