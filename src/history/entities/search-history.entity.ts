import { Entity, ObjectIdColumn, ObjectId, Column, Index } from 'typeorm';

@Entity({ name: 'search_history' })
@Index(['userId', 'createdAt'])
@Index(['userId', 'bookId', 'createdAt'])
@Index(['userId', 'keyword'])
export class SearchHistoryEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: string;

  @Column()
  keyword: string;

  @Column()
  bookId: string;

  @Column({ nullable: true })
  bookTitle?: string;

  @Column()
  source: 'suggest-click';

  @Column()
  createdAt: Date = new Date();
}
