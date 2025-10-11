import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column, BeforeInsert } from 'typeorm';

export enum Type {
  CHARGE = 'CHARGE',
  TOCASH = 'TOCASH',
  NEW = 'NEW',
  OLD = 'OLD',
  NEWREFUND = 'NEWREFUND',
}

export enum DealStatus {
  LISTING = 'LISTING',
  PROCESSING = 'PROCESSING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum DealCategory {
  BOOK = 'BOOK',
  COIN = 'COIN',
}

@Entity('deals')
export class DealsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ nullable: true })
  buyerId?: ObjectId | null;

  @Column()
  sellerId?: ObjectId;

  @Column({ type: 'string' })
  bookId: string;

  @Column()
  price: number;

  @Column()
  remainTime: number;

  @Column()
  condition: string;

  @Column()
  type: Type;

  @Column()
  dealDate: Date;

  @Column()
  registerDate: Date;

  @Column({ type: 'string', default: DealCategory.BOOK })
  category: DealCategory;

  @Column()
  status: DealStatus;

  @Column({ nullable: true })
  sourceDealId?: ObjectId;

  @Column()
  goodPoints?: string[];

  @Column({ nullable: true, length: 100 })
  comment?: string;

  @Column({ nullable: true })
  reservedBy?: ObjectId;

  @Column({ nullable: true })
  reservedAt?: Date;

  @BeforeInsert()
  setDefaultDates() {
    if (!this.dealDate) this.dealDate = new Date();
  }
}
