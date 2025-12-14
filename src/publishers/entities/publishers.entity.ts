import { Entity, ObjectIdColumn, ObjectId, Column, Index } from 'typeorm';

@Entity({ name: 'publishers' })
export class PublishersEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  loginId: string;

  @Column()
  password: string;

  @Column()
  ManagerName: string;

  @Column()
  contact: string;

  @Column()
  email: string;

  @Column()
  location: string;

  @Column()
  account: string;

  @Column()
  childPublisherIds: ObjectId[];
}
