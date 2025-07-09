import { ObjectId } from 'typeorm';
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

  @Column({ type: 'string' })
  userId: ObjectId;

  @Column({ type: 'string' })
  bookId: ObjectId;

  @Column()
  author: string;

  @Column()
  publisher: string;

  @Column()
  remain_time: number;

  @Column()
  book_status: 'SELLABLE' | 'UNSELLABLE' | 'EXPIRED' | 'ONSALE';

  @Column(() => UsedBookData)
  used_book_data: UsedBookData;
}
