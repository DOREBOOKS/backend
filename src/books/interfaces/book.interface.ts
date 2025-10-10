import { BookType } from '../entities/book.entity';

export interface OldDeal {
  dealId: string;
  sellerId?: string;
  price: number;
  date: Date;
  remainTime: number;
  goodPoints?: string[];
  comment?: string;
  priceRent?: number | null;
  priceOwn?: number | null;
  sellerName?: string;
}

export interface OldInfo {
  count: number;
  books: OldDeal[];
}

export interface BookInterface {
  id: string;
  title: string;
  author: string;
  publisher: string;
  priceRent: number;
  priceOwn: number;
  bookPic: string;
  category: string;
  totalTime: number;
  //status: BookStatus;
  detail: string;
  tableOfContents: string;
  publisherReview: string;
  isbn: string;
  page: number;
  type: BookType;
  old?: OldInfo;
  cdnUrl: string;
}
