import { BookType } from '../entities/book.entity';

export interface OldDeal {
  dealId: string;
  sellerId?: string;
  price: number;
  date: Date;
  remainTime: number;
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
  price: number;
  book_pic: string;
  category: string;
  total_time: number;
  //status: BookStatus;
  detail: string;
  tableOfContents: string;
  publisherReview: string;
  isbn: string;
  page: number;
  type: BookType;

  old?: OldInfo;
}
