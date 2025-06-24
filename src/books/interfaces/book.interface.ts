import { BookStatus } from '../entities/book.entity';

export interface BookInterface {
  id: string;
  title: string;
  author: string;
  publisher: string;
  price: number;
  book_pic: string;
  category: string;
  total_time: number;
  status: BookStatus;
  detail: {
    detail: string;
    tableOfContents: string;
    publisherReview: string;
    isbn: string;
    page: number;
  };
}
