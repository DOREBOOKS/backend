export interface UserBooksInterface {
  id: string;
  userId: string;
  dealId: string;
  title: string;
  author: string;
  publisher: string;
  remain_time: number;
  book_status: string;
  isOwned: boolean;
}
