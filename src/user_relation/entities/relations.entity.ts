import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

export type RelationType = 'BLOCK' | 'REPORT';

@Entity({ name: 'user_relation' })
@Index(['ownerId', 'targetId', 'type'], { unique: true })
export class RelationsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  ownerId: ObjectId;

  @Column()
  targetId: ObjectId;

  @Column()
  type: RelationType;

  @Column()
  text: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  contextId?: ObjectId;

  @Column()
  createdAt: Date;
}
