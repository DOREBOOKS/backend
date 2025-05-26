import { ObjectId } from 'typeorm';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('reviews')
export class ReviewEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'string' })
  bookId: ObjectId;

  @Column()
  writer: string;

  @Column()
  title: string;

  @Column()
  rating: number;

  @Column()
  comment: string;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
