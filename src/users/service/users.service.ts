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
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { Type } from 'src/deal/entity/deals.entity';

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

  //코인 계산
  private async computeCoin(userObjectId: ObjectId): Promise<number> {
    const idStr = userObjectId.toHexString();
    const coinDeals = await this.dealsRepository.find({
      where: {
        $or: [
          // 1) 코인 충전/현금전환(Deals.type=CHARGE|TOCASH, userId 매칭)
          {
            userId: userObjectId,
            type: { $in: ['CHARGE', 'TOCASH', Type.CHARGE, Type.TOCASH] },
          },
          // 2) 책 거래(신규/중고) -구매자
          {
            buyerId: { $in: [idStr, userObjectId] },
            type: { $in: ['NEW', 'OLD', Type.NEW, Type.OLD] },
          },
          // 3) 책 거래(신규/중고) - 판매자
          {
            sellerId: { $in: [idStr, userObjectId] },
            type: { $in: ['NEW', 'OLD', Type.NEW, Type.OLD] },
          },
        ],
      } as any,
    });

    let total = 0;
    for (const d of coinDeals) {
      const t = String(d.type);
      const price = Number(d.price ?? 0) || 0;

      if (t === 'CHARGE') {
        total += price;
      } else if (t === 'TOCASH') {
        total -= price;
      } else if (t === 'NEW' || t === 'OLD') {
        if (String(d.buyerId) === idStr) total -= price;
        else if (String(d.sellerId) === idStr) total += price;
      }
    }
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
