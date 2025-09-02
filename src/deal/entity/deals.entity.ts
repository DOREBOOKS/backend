import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

export enum Type {
  CHARGE = 'CHARGE',
  TOCASH = 'TOCASH',
  NEW = 'NEW',
  OLD = 'OLD',
}

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
  image: string;

  @Column()
  type: Type;

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
  sellerBookId: ObjectId;

  @Column()
  dealDate: Date;

  @Column()
  registerDate: Date;

  @Column()
  category: string;
}
