import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UserInterface } from '../interfaces/user.interface';
import { ObjectId } from 'mongodb';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { DealsEntity, DealStatus, Type } from 'src/deal/entity/deals.entity';
import { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';
import { NotificationSettings } from '../entities/user.entity';
import { makeRandomNickname } from '../utils/nickname';
import { encryptText } from 'src/common/utils/simple-encryption';

function computeSummary(ns: NotificationSettings) {
  const leaves = [
    ns.channels.push &&
      (ns.pushTopics.bookRegister || ns.pushTopics.otherMarketing),
    ns.channels.sms,
    ns.channels.email,
  ];
  const anyOn = leaves.some(Boolean);
  const allOn = leaves.every(Boolean);
  ns.summary = { anyOn, allOn, updatedAt: new Date() };
  return ns;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(DealsEntity)
    private readonly dealsRepository: Repository<DealsEntity>,
  ) {}

  createNickname(): string {
    for (let i = 0; i < 7; i++) {
      const rand = makeRandomNickname();
      return rand;
    }
    return makeRandomNickname() + Date.now().toString().slice(-3);
  }

  async create(createUserDto: CreateUserDto): Promise<UserInterface> {
    const nickname = createUserDto.nickname?.trim() || this.createNickname();
    const user = this.userRepository.create({
      ...createUserDto,
      nickname,
      state: 'active',
    });
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
    const user = await this.userRepository.findOneBy({
      _id: objectId,
      state: 'active',
    });
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
    const user = await this.userRepository.findOneBy({
      _id: objectId,
      state: 'active',
    });
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
    const user = await this.userRepository.findOneBy({
      email,
      state: 'active',
    });
    if (!user) {
      return null;
    }
    const coin = await this.computeCoin(user._id);
    return this.mapToInterface(user, coin);
  }

  async findByProvider(
    provider: 'google' | 'kakao',
    email: string,
  ): Promise<UserInterface | null> {
    const user = await this.userRepository.findOneBy({
      social: provider,
      email,
      state: 'active',
    });
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
      // 이거 작동함?
      { _id, state: 'active' },
      { $inc: { coin: amount } },
    );
  }

  async getCoin(userId: string): Promise<number> {
    const _id = new ObjectId(userId);
    const u = await this.userRepository.findOne({
      where: { _id, state: 'active' },
    });
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
        status: { $in: [DealStatus.COMPLETED, DealStatus.CANCELLED] } as any,
      } as any,
    });

    // 4) 내가 판 것(OLD, 거래 성사만) → 수입(+)
    const myOldSalesCompleted = await this.dealsRepository.find({
      where: {
        sellerId: { $in: [idStr, userObjectId] } as any,
        type: { $in: [Type.OLD, 'OLD'] } as any,
        status: DealStatus.COMPLETED as any,
        buyerId: { $ne: null } as any,
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

    const valOf = (d: any) => Number(d.amount ?? d.price ?? 0) || 0;
    const sum = (rows: DealsEntity[]) =>
      rows.reduce((acc, d) => acc + valOf(d), 0);

    const total =
      +sum(charges) -
      sum(cashouts) -
      sum(myPurchases) +
      sum(myOldSalesCompleted) +
      sum(refunds);

    return total;
  }

  private ensureDefaults(u: UserEntity) {
    if (!u.notificationSettings) {
      u.notificationSettings = {
        marketingConsent: true,
        nightConsent: true,
        channels: { push: true, sms: true, email: true },
        pushTopics: { bookRegister: true, otherMarketing: true },
        summary: { anyOn: true, allOn: true, updatedAt: new Date() },
      };
    }
  }

  async getNotificationSettings(userId: string) {
    const _id = new ObjectId(userId);
    const u = await this.userRepository.findOneBy({ _id, state: 'active' });
    if (!u) throw new NotFoundException('User not found');
    this.ensureDefaults(u);
    return computeSummary(u.notificationSettings!);
  }

  /* 규칙
     A) marketingConsent = false  ⇒ 모든 하위(채널/토픽) false로 일괄 OFF
     B) marketingConsent = true   ⇒ 모든 하위 true로 일괄 ON   (홈 마스터 스위치 동작)
     C) channels.push=false       ⇒ pushTopics 모두 false
     D) pushTopics 중 하나라도 true면 channels.push를 true로 자동 승격
     E) 하위 항목이 전부 false면 marketingConsent도 false로 자동 동기화
        (단, 홈에서 마스터만 true로 켰을 땐 전부 true) */

  async updateNotificationSettings(
    userId: string,
    body: UpdateNotificationSettingsDto,
  ) {
    const _id = new ObjectId(userId);
    const u = await this.userRepository.findOneBy({ _id, state: 'active' });
    if (!u) throw new NotFoundException('User not found');
    this.ensureDefaults(u);
    const ns = u.notificationSettings!;

    // 1) 홈 마스터 스위치 우선 적용
    if (typeof body.marketingConsent === 'boolean') {
      const v = body.marketingConsent;
      ns.marketingConsent = v;
      ns.channels.push = v;
      ns.channels.sms = v;
      ns.channels.email = v;
      ns.pushTopics.bookRegister = v;
      ns.pushTopics.otherMarketing = v;
    }

    // 2) 개별 채널 적용
    if (body.channels) {
      if (typeof body.channels.push === 'boolean') {
        ns.channels.push = body.channels.push;

        if (ns.channels.push) {
          ns.pushTopics.bookRegister = true;
          ns.pushTopics.otherMarketing = true;
        } else {
          ns.pushTopics.bookRegister = false;
          ns.pushTopics.otherMarketing = false;
        }
      }
      if (typeof body.channels.sms === 'boolean')
        ns.channels.sms = body.channels.sms;
      if (typeof body.channels.email === 'boolean')
        ns.channels.email = body.channels.email;
    }

    // 3) 푸시 토픽 적용
    if (body.pushTopics) {
      if (typeof body.pushTopics.bookRegister === 'boolean') {
        ns.pushTopics.bookRegister = body.pushTopics.bookRegister;
      }
      if (typeof body.pushTopics.otherMarketing === 'boolean') {
        ns.pushTopics.otherMarketing = body.pushTopics.otherMarketing;
      }
      // 토픽 중 하나라도 true면 push 채널 자동 on
      if (ns.pushTopics.bookRegister || ns.pushTopics.otherMarketing) {
        ns.channels.push = true;
      }
    }

    // 4) 야간 동의
    if (typeof body.nightConsent === 'boolean') {
      ns.nightConsent = body.nightConsent;
    }

    // 5) 최종 동기화: 하위가 모두 꺼지면 마스터 false, 하나라도 켜지면 true
    computeSummary(ns);
    ns.marketingConsent = ns.summary.anyOn;

    await this.userRepository.save(u);
    return ns;
  }
  async removeUser(userId: string) {
    const objectId = new ObjectId(userId);
    const user = await this.userRepository.findOneBy({
      _id: objectId,
      state: 'active',
    });
    if (!user) throw new UnauthorizedException('no user');
    const newUser = await this.userRepository.save({
      ...user,
      email: encryptText(user.email ?? ''),
      name: encryptText(user.name ?? ''),
      state: 'inactive',
    });
    return newUser;
  }

  private mapToInterface(entity: UserEntity, coin: number): UserInterface {
    return {
      id: entity._id.toHexString(),
      profilePic: entity.profilePic || '',
      password: entity.password, // Assuming password is not returned in the interface
      name: entity.name,
      nickname: entity.nickname,
      email: entity.email,
      age: entity.age,
      bank: entity.bank,
      bankAccount: entity.bankAccount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      coin,
      social: entity.social,
      state: entity.state,
      notificationSettings: entity.notificationSettings,
    };
  }
}
