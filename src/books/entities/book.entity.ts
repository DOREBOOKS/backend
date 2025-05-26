import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

@Entity('books')
export class BookEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  publisher: string;

  @Column()
  price: number;

  @Column()
  book_pic: string;

  @Column()
  category: string;

  @Column()
  total_time: number;

  @Column()
  status: string;
}
