export interface DealsInterface {
  id: string;
  type: string;
  buyerId: string;
  sellerId: string;
  publisherId: string;
  bookId: string;
  price: number;
  // originalPriceRent: number | null;
  // originalPriceOwn: number | null;
  condition: string;
  dealDate: Date;
  registerDate: Date;
  category: string;
  sourceDealId: string;
  goodPoints?: string[];
  comment?: string;

  remainTime?: number;
  totalTime?: number;
}
