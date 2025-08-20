import { ObjectId } from 'typeorm';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
export class ReviewEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'string' })
  bookId: ObjectId;

  @Column()
  writer: string;

  @Column()
  rating: number;

  @Column()
  comment: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
