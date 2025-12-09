export interface UserBooksInterface {
  id: string;
  userId: string;
  dealId: string;
  bookId: string;
  title: string;
  bookPic: string;
  author: string;
  publisher: string;
  remainTime: number;
  totalTime?: number;
  book_status: string;
  condition: 'OWN' | 'RENT';
  priceOriginal: number | null;
  priceRent: number | null;
  priceOwn: number | null;
  price?: number | null;
  remainTransferCount: number;
  tableOfContents?: string[];
  goodPoints?: string[] | undefined;
  comment?: string | null;
  expiredDate?: Date | null;
  //isOwned: boolean;
}
