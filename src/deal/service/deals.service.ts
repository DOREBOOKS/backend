import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealsEntity } from '../entity/deals.entity';
import { CreateNewDealsDto } from '../dto/create-newdeals.dto';
import { CreateOldDealsDto } from '../dto/create-olddeals.dto';
import { DealsInterface } from '../interface/deals.interface';
import { ObjectId } from 'mongodb';
import { UpdateDealsDto } from '../dto/update-deals.dto';
import { CreateDealsDto } from '../dto/create-deals.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
  ) {}

  async createNew(dto: CreateNewDealsDto): Promise<DealsInterface> {
    const deals = this.dealsRepository.create({
      ...dto,
      userId: new ObjectId(dto.userId),
      registerId: new ObjectId(),
    });

    const saved = await this.dealsRepository.save(deals);
    return this.mapToInterface(saved);
  }

  async createOld(dto: CreateOldDealsDto): Promise<DealsInterface> {
    const deals = this.dealsRepository.create({
      ...dto,
      userId: new ObjectId(dto.userId),
      registerId: new ObjectId(),
    });

    const saved = await this.dealsRepository.save(deals);
    return this.mapToInterface(saved);
  }

  async deleteDeals(registerId: string): Promise<{ message: string }> {
    if (!ObjectId.isValid(registerId)) {
      throw new BadRequestException(
        'Invalid dealId format. Must be a 24-character hex string.',
      );
    }
    const objectId = new ObjectId(registerId);
    const result = await this.dealsRepository.delete({ registerId: objectId });

    if (result.affected === 0) {
      throw new NotFoundException(`Deal with id ${registerId} not found`);
    }
    return { message: `Deal with id ${registerId} deleted successfully` };
  }

  async updateDeals(
    registerId: string,
    dto: UpdateDealsDto,
  ): Promise<DealsInterface> {
    const objectId = new ObjectId(registerId);
    const deal = await this.dealsRepository.findOneBy({ registerId: objectId });

    if (!deal) {
      throw new NotFoundException(`No deal found with bookId ${registerId}`);
    }
    Object.assign(deal, dto);

    await this.dealsRepository.save(deal);
    return this.mapToInterface(deal);
  }

  async findByRegisteredUserId(userId: string): Promise<DealsInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid UserId');
    }
    const objectId = new ObjectId(userId);
    const deals = await this.dealsRepository.find({
      where: { userId: objectId },
    });
    return deals.map((deal) => this.mapToInterface(deal));
  }

  async createDeals(dto: CreateDealsDto): Promise<DealsInterface> {
    const deal = this.dealsRepository.create({
      ...dto,
      dealId: new ObjectId(),
    });

    const insertResult = await this.dealsRepository.insert(deal);
    const saved = await this.dealsRepository.findOneBy({
      _id: insertResult.identifiers[0]._id,
    });

    if (!saved) {
      throw new NotFoundException('Failed to find inserted deal');
    }

    return this.mapToInterface(saved);
  }

  async findDoneByUserId(userId: string): Promise<DealsInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    const objectId = new ObjectId(userId);

    const deals = await this.dealsRepository.find({
      where: {
        userId: objectId,
      },
    });
    return deals.map((deal) => this.mapToInterface(deal));
  }
  private mapToInterface(entity: DealsEntity): DealsInterface {
    return {
      id: entity._id.toHexString() || '',
      registerId: entity.registerId?.toHexString() || '',
      dealId: entity.dealId?.toHexString() || '',
      userId: entity.userId.toHexString() || '',
      type: entity.type,
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      bookId: entity.bookId,
      price: entity.price,
      title: entity.title,
      author: entity.author,
      condition: entity.condition,
      buyerBookId: entity.buyerBookId,
      sellerBookId: entity.sellerBookId,
      dealDate: entity.dealDate,
      registerDate: entity.registerDate,
    };
  }
}
