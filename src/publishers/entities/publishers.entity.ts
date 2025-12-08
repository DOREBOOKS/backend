import { Entity, ObjectIdColumn, ObjectId, Column, Index } from 'typeorm';

@Entity({ name: 'publishers' })
export class PublisherEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column()
  id: string;

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
