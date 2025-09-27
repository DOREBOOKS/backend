export interface UserBooksInterface {
  id: string;
  userId: string;
  dealId: string;
  bookId: string;
  title: string;
  image: string;
  author: string;
  publisher: string;
  remain_time: number;
  book_status: string;
  condition: 'OWN' | 'RENT';
  //isOwned: boolean;
}
