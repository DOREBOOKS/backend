import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type NoticeType = 'ANY' | 'NEW' | 'OLD';

@Entity('notice_interests')
//@Index(['userId', 'bookId'], { unique: true, sparse: true })
@Index(['userId', 'bookKey'], { unique: true, sparse: true })
@Index(['userId', 'noticedAt'])
@Index(['bookId', 'noticeType'])
@Index(['bookKey', 'noticeType'])
export class NoticeInterestEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column() userId: ObjectId;

  //등록된 책이면 bookId 사용
  @Column({ nullable: true }) bookId: ObjectId;

  //미등록 책 대기 알림용 키(ISBN 우선, 없으면 제목|저자 구분)
  @Column({ nullable: true }) bookKey?: string;

  //스냅샷(목록 표시용)-미등록 상태에서도 타이틀/저자 노출
  //@Column({ nullable: true }) isbn?: string;
  @Column({ nullable: true }) title?: string;
  @Column({ nullable: true }) author?: string;
  //@Column({ nullable: true }) publisher?: string;
  // @Column({ nullable: true }) coverUrl?: string;
  @Column({ nullable: true }) wantMinutes?: number;
  @Column({ nullable: true }) wantPrice?: number;

  @Column({ default: true }) notice: boolean;
  @Column({ default: 'ANY' }) noticeType: NoticeType;

  @Column({ nullable: true }) noticedAt?: Date;
  @Column({ default: () => new Date() }) createdAt: Date;
  @Column({ nullable: true }) updatedAt?: Date;
}
