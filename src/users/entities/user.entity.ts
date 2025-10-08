import { ObjectId } from 'mongodb';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// @Index('IDX_USER_EMAIL', ['email'], { unique: true })

@Entity('users')
export class UserEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ nullable: true })
  profilePic: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  bank: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column()
  social: 'local' | 'kakao' | 'naver' | 'google' | 'apple';

  @Column()
  gender?: 'male' | 'female';

  @CreateDateColumn()
  birth: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  coin: number;
}
