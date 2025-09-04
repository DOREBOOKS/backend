import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('heart_interests')
@Index(['userId', 'bookId'], { unique: true })
@Index(['userId', 'heartedAt'])
export class HeartInterestEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column() userId: ObjectId;
  @Column() bookId: ObjectId;

  @Column({ default: true }) heart: boolean;
  @Column({ nullable: true }) heartedAt?: Date;

  @Column({ default: () => new Date() }) createdAt: Date;
  @Column({ nullable: true }) updatedAt?: Date;
}
