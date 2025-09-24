import { GoodPoint } from 'src/common/constants/good-points.enum';

export interface ReviewInterface {
  id: string;
  bookId: string;
  writer: string;
  comment: string;
  created_at: Date;
  updated_at: Date;
  goodPoints: GoodPoint[];
}
