export interface ReviewInterface {
  id: string;
  bookId: string;
  writer: string;
  title: string;
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
}
