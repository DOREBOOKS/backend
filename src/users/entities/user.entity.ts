import { ObjectId } from 'mongodb';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// @Index('IDX_USER_EMAIL', ['email'], { unique: true })
@Entity('users')
export class UserEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ nullable: true })
  profilePic?: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  age?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  point: string;
}
