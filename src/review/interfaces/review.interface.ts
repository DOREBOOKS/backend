import { GoodPoint } from 'src/common/constants/good-points.enum';

export interface ReviewInterface {
  id: string;
  bookId: string;
  userId: string;
  writer: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  goodPoints: GoodPoint[];
}
