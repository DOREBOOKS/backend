import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBooksEntity } from '../entities/userbooks.entity';
import { UserBooksInterface } from '../interfaces/userbooks.interface';
import { ObjectId } from 'mongodb';
import { DealsEntity } from 'src/deal/entity/deals.entity';

@Injectable()
export class UserBooksService {
  constructor(
    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
  ) {}

  // 유저별 보유 도서 조회
  async findByUserId(userId: string): Promise<UserBooksInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const objectId = new ObjectId(userId);

    // UserBooksEntity에서 현재 보유 중이거나 과거에 보유했던 책 모두 조회
    const userBooks = await this.userBookRepository.find({
      where: { userId: objectId },
    });

    return userBooks.map((book) => this.mapToInterface(book));
  }

  // entity → interface 매핑 함수
  private mapToInterface(entity: UserBooksEntity): UserBooksInterface {
    return {
      id: entity._id.toHexString(),
      userId: entity.userId.toString(),
      dealId: entity.dealId.toString(),
      bookId: entity.bookId?.toString(),
      image: entity.image,
      title: entity.title,
      author: entity.author,
      publisher: entity.publisher,
      remain_time: entity.remain_time,
      book_status: entity.book_status,
      isOwned: entity.isOwned,
    };
  }
}
