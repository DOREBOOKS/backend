export interface DealsInterface {
  id: string;
  //registerId: string;
  //dealId: string;
  //userId: string;
  type: string;
  buyerId: string;
  sellerId: string;
  bookId: string;
  price: number;
  originalPriceRent: number | null;
  originalPriceOwn: number | null;
  title: string;
  author: string;
  remainTime: number;
  condition: string;
  // buyerBookId: string;
  // sellerBookId: string;
  dealDate: Date;
  registerDate: Date;
  bookPic: string;
  publisher: string;
  category: string;
  sourceDealId: string;
  goodPoints?: string[];
  comment?: string;
}
