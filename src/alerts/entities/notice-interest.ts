import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type NoticeType = 'ANY' | 'NEW' | 'OLD';

@Entity('notice_interests')
@Index(['userId', 'bookId'], { unique: true })
@Index(['userId', 'noticedAt'])
@Index(['bookId', 'noticeType'])
export class NoticeInterestEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column() userId: ObjectId;
  @Column() bookId: ObjectId;

  @Column({ default: true }) notice: boolean;
  @Column({ default: 'ANY' }) noticeType: NoticeType;

  @Column({ nullable: true }) noticedAt?: Date;
  @Column({ default: () => new Date() }) createdAt: Date;
  @Column({ nullable: true }) updatedAt?: Date;
}
