import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBooksEntity } from '../entities/userbooks.entity';
import { UserBooksInterface } from '../interfaces/userbooks.interface';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserBooksService {
  constructor(
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
  ) {}

  // 유저별 보유 도서 조회
  async findByUserId(userId: string): Promise<UserBooksInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const userBooks = await this.userBookRepository.find({
      where: { userId: new ObjectId(userId), isOwned: true },
    });

    return userBooks.map((book) => this.mapToInterface(book));
  }

  // entity → interface 매핑 함수
  private mapToInterface(entity: UserBooksEntity): UserBooksInterface {
    return {
      id: entity._id.toHexString(),
      userId: entity.userId.toString(),
      bookId: entity.bookId.toString(),
      author: entity.author,
      publisher: entity.publisher,
      remain_time: entity.remain_time,
      book_status: entity.book_status,
      isOwned: entity.isOwned,
      used_book_data: {
        price: entity.used_book_data?.price,
        date: entity.used_book_data?.date,
        buyer: entity.used_book_data?.buyer,
        seller: entity.used_book_data?.seller,
      },
    };
  }
}
