import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

export enum Type {
  CHARGE = 'CHARGE',
  TOCASH = 'TOCASH',
  NEW = 'NEW',
  OLD = 'OLD',
  NEWREFUND = 'NEWREFUND',
}

export enum DealStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('deals')
export class DealsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  // @Column('objectId')
  // registerId: ObjectId;

  @Column('objectId')
  dealId: ObjectId;

  @Column('objectId')
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
  sellerBookId: string;

  @Column()
  dealDate: Date;

  @Column()
  registerDate: Date;

  @Column()
  category: string;

  @Column({ default: DealStatus.ACTIVE })
  status: DealStatus;

  @Column({ nullable: true })
  sourceDealId?: ObjectId;

  @Column()
  goodPoints?: string[];

  @Column({ nullable: true, length: 100 })
  comment?: string;
}
