import { IntegerType, ObjectId } from 'typeorm';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('deals')
export class DealsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column('objectId')
  registerId: ObjectId;

  @Column('objectId')
  dealId: ObjectId;

  @ObjectIdColumn()
  userId: ObjectId;

  @Column()
  type: string;

  @Column({ type: 'string' })
  buyerId: string;

  @Column({ type: 'string' })
  sellerId: string;

  @Column({ type: 'string' })
  bookId: string;

  @Column()
  price: string;

  @Column()
  title: string;

  @Column()
  author: string;

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
