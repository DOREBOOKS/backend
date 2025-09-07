import { ObjectId } from 'mongodb';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['bookId', 'userId'], { unique: true })
@Entity('reviews')
export class ReviewEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'string' })
  bookId: ObjectId;

  @Column({ type: 'string' })
  userId: ObjectId;

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
