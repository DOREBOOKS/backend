import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { PublishersEntity } from '../entities/publishers.entity';
import { CreatePublisherDto } from '../dto/create-publisher.dto';
import { PublisherBookStatsDto } from '../dto/read-publisher-book-stats.dto';
import { BookEntity } from 'src/books/entities/book.entity';
import { PublishersInterface } from '../interfaces/publishers.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(PublishersEntity)
    private readonly publishersRepository: MongoRepository<PublishersEntity>,
    @InjectRepository(BookEntity)
    private readonly booksRepository: MongoRepository<BookEntity>,
  ) {}

  async findOneByLoginId(loginId: string): Promise<PublishersInterface | null> {
    const publisher = await this.publishersRepository.findOne({
      where: { loginId },
    });

    return publisher ? this.mapToInterface(publisher) : null;
  }

  async findOneByObjectId(id: string | ObjectId): Promise<PublishersInterface> {
    const _id = id instanceof ObjectId ? id : new ObjectId(id);

    const publisher = await this.publishersRepository.findOne({
      where: { _id },
    });

    if (!publisher) {
      throw new NotFoundException('출판사를 찾을 수 없습니다.');
    }

    return this.mapToInterface(publisher);
  }

  async create(dto: CreatePublisherDto): Promise<PublishersInterface> {
    const exists = await this.publishersRepository.findOne({
      where: { loginId: dto.loginId },
    });
    if (exists) {
      throw new BadRequestException('이미 사용 중인 출판사 아이디입니다.');
    }

    const childIds: ObjectId[] =
      dto.childPublisherIds
        ?.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : null))
        ?.filter((v): v is ObjectId => v !== null) ?? [];

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const entity = this.publishersRepository.create({
      name: dto.name,
      loginId: dto.loginId,
      password: hashedPassword,
      ManagerName: dto.ManagerName,
      contact: dto.contact,
      email: dto.email,
      location: dto.location,
      account: dto.account,
      childPublisherIds: childIds,
    });

    const saved = await this.publishersRepository.save(entity);
    return this.mapToInterface(saved);
  }

  async findAll(params?: {
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PublishersInterface[]; total: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.keyword) {
      const regex = new RegExp(params.keyword, 'i');
      where.$or = [{ name: regex }];
    }

    const [items, total] = await this.publishersRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { name: 'ASC' as any },
    });

    return {
      items: items.map((p) => this.mapToInterface(p)),
      total,
    };
  }

  async findOneById(publisherId: string): Promise<PublishersInterface> {
    if (!ObjectId.isValid(publisherId)) {
      throw new BadRequestException('유효하지 않은 publisherId 입니다.');
    }
    const _id = new ObjectId(publisherId);

    const publisher = await this.publishersRepository.findOne({
      where: { _id },
    });

    if (!publisher) {
      throw new NotFoundException('출판사를 찾을 수 없습니다.');
    }
    return this.mapToInterface(publisher);
  }

  //출판사별 도서 통계 조회 (총 도서 수, 중고거래 지원 도서 수, 오디오북 지원 도서 수, 중고거래 미지원 도서 수)
  //중고거래 지원 도서 수 : maxTransferCount>0, 오디오북 지원 도서 수 : audioBookEnabled=true
  async getBookStatsByPublisher(
    publisherId: string,
  ): Promise<PublisherBookStatsDto> {
    if (!ObjectId.isValid(publisherId)) {
      throw new BadRequestException('유효하지 않은 publisherId 입니다.');
    }
    const publisherObjectId = new ObjectId(publisherId);

    const [totalBooks, usedTradeSupportedBooks, audioBookEnabledBooks] =
      await Promise.all([
        // 총 도서 수
        this.booksRepository.countBy({
          publisherId: publisherObjectId as any,
        }),

        // 중고거래 지원 도서 수 (maxTransferCount > 0)
        this.booksRepository.countBy({
          publisherId: publisherObjectId as any,
          maxTransferCount: { $gt: 0 } as any,
        } as any),

        // 오디오북 지원 도서 수
        this.booksRepository.countBy({
          publisherId: publisherObjectId as any,
          audioBookEnabled: true,
        }),
      ]);

    const usedTradeNotSupportedBooks = totalBooks - usedTradeSupportedBooks;

    return {
      totalBooks,
      usedTradeSupportedBooks,
      audioBookEnabledBooks,
      usedTradeNotSupportedBooks,
    };
  }

  async findEntityByLoginId(loginId: string): Promise<PublishersEntity | null> {
    return this.publishersRepository.findOne({
      where: { loginId },
    });
  }

  public toInterface(entity: PublishersEntity): PublishersInterface {
    return this.mapToInterface(entity);
  }

  private mapToInterface(entity: PublishersEntity): PublishersInterface {
    return {
      id: entity._id.toHexString(),
      name: entity.name,
      loginId: entity.loginId,
      ManagerName: entity.ManagerName,
      contact: entity.contact,
      email: entity.email,
      location: entity.location,
      account: entity.account,
      childPublisherIds: (entity.childPublisherIds ?? []).map((id) =>
        id.toHexString(),
      ),
    };
  }
}
