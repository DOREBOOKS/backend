import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('deals')
export class DealsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  // @Column('objectId')
  // registerId: ObjectId;

  @Column('objectId')
  dealId: ObjectId;

  @ObjectIdColumn()
  userId: ObjectId;

  @Column()
  type: string;

  @Column('objectId')
  buyerId: string;

  @Column('objectId')
  sellerId: string;

  @Column({ type: 'string' })
  bookId: string;

  @Column()
  price: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  publisher: string;

  @Column()
  remainTime: number;

  @Column()
  condition: string;

  @Column()
  buyerBookId: string;

  @Column()
  sellerBookId: string;

  @Column()
  dealDate: Date;

  @Column()
  registerDate: Date;
}
