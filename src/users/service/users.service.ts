import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UserInterface } from '../interfaces/user.interface';
import { ObjectId } from 'mongodb';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { DealsEntity, DealStatus, Type } from 'src/deal/entity/deals.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserInterface> {
    const user = this.userRepository.create(createUserDto);
    try {
      await this.userRepository.save(user);
      const coin = 0;
      return this.mapToInterface(user, coin);
    } catch (error) {
      const code = error.code ?? error.driverError?.code;
      if (code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<UserInterface[]> {
    const users = await this.userRepository.find();
    //각 유저별로 코인들 실시간 계산해서 덮어쓰기
    return Promise.all(
      users.map(async (u) => {
        const coin = await this.computeCoin(u._id);
        return this.mapToInterface(u, coin);
      }),
    );
  }

  async findOne(id: string): Promise<UserInterface> {
    const objectId = new ObjectId(id);
    const user = await this.userRepository.findOneBy({ _id: objectId });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const coin = await this.computeCoin(objectId);
    return this.mapToInterface(user, coin);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserInterface> {
    const objectId = new ObjectId(id);
    const user = await this.userRepository.findOneBy({ _id: objectId });
    if (!user) {
      throw new NotFoundException(
        `User with id ${objectId.toString()} not found`,
      );
    }
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    const coin = await this.computeCoin(objectId);
    return this.mapToInterface(user, coin);
  }

  async findByEmail(email: string): Promise<UserInterface | null> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return null;
    }
    const coin = await this.computeCoin(user._id);
    return this.mapToInterface(user, coin);
  }

  async addCoin(userId: string, amount: number): Promise<void> {
    const _id = new ObjectId(userId);
    // Mongo의 경우: 원자적 증감
    await (this.userRepository as any).updateOne(
      { _id },
      { $inc: { coin: amount } },
    );
  }

  async getCoin(userId: string): Promise<number> {
    const _id = new ObjectId(userId);
    const u = await this.userRepository.findOne({ where: { _id } });
    return Number(u?.coin ?? 0);
  }

  //코인 계산
  private async computeCoin(userObjectId: ObjectId): Promise<number> {
    const idStr = userObjectId.toHexString();

    // 1) 충전(+)
    const charges = await this.dealsRepository.find({
      where: {
        buyerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.CHARGE, 'CHARGE'] } as any,
        status: { $ne: DealStatus.CANCELLED } as any,
      } as any,
    });

    // 2) 현금전환(-)
    const cashouts = await this.dealsRepository.find({
      where: {
        buyerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.TOCASH, 'TOCASH'] } as any,
        status: { $ne: DealStatus.CANCELLED } as any,
      } as any,
    });

    // 3) 내가 산 것(NEW/OLD) → 지출(-)
    const myPurchases = await this.dealsRepository.find({
      where: {
        buyerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.NEW, Type.OLD, 'NEW', 'OLD'] } as any,
        status: { $in: [DealStatus.LISTING, DealStatus.COMPLETED] } as any,
      } as any,
    });

    // 4) 내가 판 것(OLD, 거래 성사만) → 수입(+)
    const myOldSalesCompleted = await this.dealsRepository.find({
      where: {
        sellerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.OLD, 'OLD'] } as any,
        status: DealStatus.COMPLETED as any, // ✅ 등록글(OLD+ACTIVE) 제외
      } as any,
    });

    // 5) 신규 환불(+)
    const refunds = await this.dealsRepository.find({
      where: {
        buyerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.NEWREFUND, 'NEWREFUND'] } as any,
        status: { $ne: DealStatus.CANCELLED } as any,
      } as any,
    });

    const sum = (rows: DealsEntity[]) =>
      rows.reduce((acc, d) => acc + (Number(d.price ?? 0) || 0), 0);

    const total =
      +sum(charges) -
      sum(cashouts) -
      sum(myPurchases) +
      sum(myOldSalesCompleted) +
      sum(refunds);

    return total;
  }

  private mapToInterface(entity: UserEntity, coin: number): UserInterface {
    return {
      id: entity._id.toHexString(),
      profilePic: entity.profilePic || '',
      password: entity.password, // Assuming password is not returned in the interface
      name: entity.name,
      email: entity.email,
      age: entity.age,
      bank: entity.bank,
      bankAccount: entity.bankAccount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      coin,
    };
  }
}
