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

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(PublishersEntity)
    private readonly publishersRepository: MongoRepository<PublishersEntity>,
  ) {}

  async create(dto: CreatePublisherDto): Promise<PublishersEntity> {
    const exists = await this.publishersRepository.findOne({
      where: { id: dto.id },
    });
    if (exists) {
      throw new BadRequestException('이미 사용 중인 출판사 아이디입니다.');
    }

    const childIds: ObjectId[] =
      dto.childPublisherIds
        ?.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : null))
        ?.filter((v): v is ObjectId => v !== null) ?? [];

    const entity = this.publishersRepository.create({
      name: dto.name,
      id: dto.id,
      password: dto.password,
      ManagerName: dto.ManagerName,
      contact: dto.contact,
      email: dto.email,
      location: dto.location,
      account: dto.account,
      childPublisherIds: childIds,
    });

    return this.publishersRepository.save(entity);
  }

  async findAll(params?: {
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: PublishersEntity[]; total: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.keyword) {
      const regex = new RegExp(params.keyword, 'i');
      where.$or = [{ name: regex }, { id: regex }];
    }

    const [items, total] = await this.publishersRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { name: 'ASC' as any },
    });

    return { items, total };
  }

  async findOneById(publisherId: string): Promise<PublishersEntity> {
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
    return publisher;
  }
}
