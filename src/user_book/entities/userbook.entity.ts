import { IntegerType, ObjectId } from 'typeorm';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('userbook')
export class UserBookEntity {
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

  @Column((type) => UsedBookData)
  used_book_data: UsedBookData;
}

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
