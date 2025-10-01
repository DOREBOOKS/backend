import { Entity, ObjectIdColumn, Column, Index } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('device_tokens')
@Index(['userId', 'token'], { unique: true })
@Index(['userId', 'updatedAt'])
export class DeviceTokenEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  token: string;

  @Column({ nullable: true })
  platform?: 'android' | 'ios';

  @Column({ nullable: true })
  appVersion?: string;

  @Column({ default: () => new Date() })
  createdAt: Date;

  @Column({ default: () => new Date() })
  updatedAt: Date;
}
