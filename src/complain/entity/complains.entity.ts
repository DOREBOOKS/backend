import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ComplainState } from 'src/common/constants/complains-state.enum';

@Entity('complains')
export class ComplainsEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  type: string;

  @Column({ default: ComplainState.READY })
  state: ComplainState;

  @Column()
  text: string;

  @Column()
  replyEmail?: string;
}
