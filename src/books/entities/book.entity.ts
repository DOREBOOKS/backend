import { ObjectId } from 'mongodb';
import { Entity, ObjectIdColumn, Column } from 'typeorm';

export enum BookStatus {
  SALE = '판매중',
  SOLD = '판매완료',
}

export enum BookType {
  OLD = 'OLD',
  NEW = 'NEW',
}
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

  // @Column()
  // status: BookStatus;

  @Column()
  detail: string;

  @Column()
  tableOfContents: string;

  @Column()
  publisherReview: string;

  @Column()
  isbn: string;

  @Column()
  page: number;

  @Column()
  type: BookType;

  @Column()
  cdn_url: string;
}
