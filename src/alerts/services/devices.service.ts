import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { DeviceTokenEntity } from '../entities/device-token.entity';
import { ObjectId } from 'mongodb';

function asObjectId(id: string | ObjectId, label = 'id'): ObjectId {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id);
  throw new BadRequestException(`Invalid ${label} format`);
}

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly repo: MongoRepository<DeviceTokenEntity>,
  ) {}

  async save(
    userId: string,
    token: string,
    opts?: { platform?: 'android' | 'ios'; appVersion?: string },
  ) {
    const u = asObjectId(userId, 'userId');
    await this.repo.updateOne(
      { userId: u, token } as any,
      {
        $set: {
          userId: u,
          token,
          platform: opts?.platform,
          appVersion: opts?.appVersion,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true } as any,
    );
  }

  async getTokens(userId: string) {
    const u = asObjectId(userId, 'userId');
    const rows = await this.repo.find({ where: { userId: u } as any });
    return rows.map((r) => r.token);
  }

  async removeByUser(userId: string) {
    const u = asObjectId(userId, 'userId');
    await this.repo.deleteMany({ userId: u } as any);
  }

  async removeTokens(tokens: string[]) {
    if (!tokens?.length) return;
    await this.repo.deleteMany({ token: { $in: tokens } } as any);
  }
}
