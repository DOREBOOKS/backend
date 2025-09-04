import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type NotificationKind = 'BOOK_LISTED';

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
export class NotificationEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  kind: NotificationKind;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  payload?: {
    bookId?: string;
    dealId?: string;
    image?: string;
    author?: string;
    price?: number | string;
  };

  @Column({ default: () => new Date() })
  createdAt: Date;
}
