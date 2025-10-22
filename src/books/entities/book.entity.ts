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

  @Column() priceRent: number;

  @Column() priceOwn: number;

  @Column() priceOriginal: number;

  @Column() pricePaper: number;

  @Column()
  bookPic: string;

  @Column()
  category: string;

  @Column()
  totalTime: number;

  @Column()
  publicationDate: Date;

  @Column()
  detail: string;

  @Column()
  tableOfContents: string;

  @Column()
  publisherReview: string;

  @Column()
  isbn: string;

  @Column()
  isbnPaper: string;

  @Column()
  page: number;

  @Column()
  type: BookType;

  @Column()
  cdnUrl: string;

  @Column()
  encCdnUrl: string;

  @Column()
  ownDiscount: number;

  @Column()
  rentDiscount: number;
}
