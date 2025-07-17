import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('complains')
export class ComplainsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  type: string;

  @Column()
  writer: string;

  @Column()
  state: string;

  @Column()
  text: string;
}
