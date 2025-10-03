import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('userbooks')
export class UserBooksEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  dealId: ObjectId;

  @Column()
  bookId: ObjectId;

  @Column()
  image: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  publisher: string;

  @Column()
  remainTime: number;

  @Column()
  book_status: 'SELLING' | 'MINE' | 'REFUNDED' | 'SOLD';

  @Column()
  condition?: 'OWN' | 'RENT';

  @Column({ default: false })
  isDownloaded: boolean;

  @Column()
  priceRent: number;

  @Column()
  priceOwn: number;

  @Column()
  price?: number;
}
