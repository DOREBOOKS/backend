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
  remainTime: number;

  @Column()
  totalTime?: number;

  @Column()
  book_status: 'SELLING' | 'MINE' | 'REFUNDED' | 'SOLD';

  @Column()
  condition?: 'OWN' | 'RENT';

  @Column({ default: false })
  isDownloaded: boolean;

  @Column({ default: 0 })
  transferDepth: number;

  @Column({ nullable: true })
  expiredDate?: Date;
}
