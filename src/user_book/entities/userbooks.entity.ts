import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

// export class UsedBookData {
//   @Column()
//   price: number;

//   @Column()
//   date: Date;

//   @Column()
//   buyer: ObjectId;

//   @Column()
//   seller: ObjectId;
// }

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

  // @Column({ default: false })
  // isOwned: boolean;

  // @Column(() => UsedBookData)
  // used_book_data: UsedBookData;

  @Column({ default: false })
  isDownloaded: boolean;
}
