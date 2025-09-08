import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

export class UsedBookData {
  @Column()
  price: number;

  @Column()
  date: Date;

  @Column()
  buyer: string;

  @Column()
  seller: string;
}

@Entity('userbook')
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
  remain_time: number;

  @Column()
  book_status: 'SELLING' | 'MINE';

  @Column()
  condition?: 'OWN' | 'RENT';

  @Column({ default: false })
  isOwned: boolean;

  @Column(() => UsedBookData)
  used_book_data: UsedBookData;
}
