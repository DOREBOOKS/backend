export interface UserBooksInterface {
  id: string;
  userId: string;
  bookId: string;
  author: string;
  publisher: string;
  remain_time: number;
  book_status: string;
  used_book_data: { price: number; date: Date; buyer: string; seller: string };
}
