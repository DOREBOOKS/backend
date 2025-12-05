import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ComplainsEntity } from '../entity/complains.entity';
import { CreateComplainsDto } from '../dto/create-complains.dto';
import { MailService } from 'src/mail/service/mail.service';
import { ObjectId } from 'mongodb';
import { UserEntity } from 'src/users/entities/user.entity';
import { ComplainsInterface } from '../interface/complains.interface';
import { ComplainState } from 'src/common/constants/complains-state.enum';
import { UpdateComplainStateDto } from '../dto/update-complains.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ComplainsService {
  constructor(
    @InjectRepository(ComplainsEntity)
    private readonly repo: MongoRepository<ComplainsEntity>,
    @InjectRepository(UserEntity)
    private readonly users: MongoRepository<UserEntity>,
    private readonly mailService: MailService,
  ) {}

  async findAll(): Promise<ComplainsInterface[]> {
    const rows = await this.repo.find({ order: { _id: 'desc' as any } });
    return this.enrichWithWriter(rows);
  }

  async findByUserId(userId: string): Promise<ComplainsInterface[]> {
    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    const uid = new ObjectId(userId);
    const rows = await this.repo.find({
      where: { userId: uid },
      order: { createdAt: 'desc' as any },
    });
    return this.enrichWithWriter(rows);
  }

  async create(
    dto: CreateComplainsDto,
    authUser: any,
  ): Promise<ComplainsInterface> {
    const authIdHex =
      authUser?.id ?? authUser?._id ?? authUser?.userId ?? authUser?.sub;

    if (!authIdHex || !ObjectId.isValid(authIdHex)) {
      throw new BadRequestException('Invalid authenticated user');
    }
    const uid = new ObjectId(authIdHex);

    const user = await this.users.findOne({ where: { _id: uid } as any });
    if (!user) {
      throw new BadRequestException('User not found for given auth');
    }

    const now = new Date();

    const entity = this.repo.create({
      type: dto.type,
      userId: uid,
      state: dto.state ?? ComplainState.READY,
      text: dto.text,
      replyEmail: dto.replyEmail?.trim(),
      createdAt: now,
    });
    const saved = await this.repo.save(entity);

    // 메일 비동기
    this.mailService
      .sendComplainNotice({
        id: (saved._id as ObjectId).toHexString(),
        type: saved.type,
        text: saved.text,
        writer: (user.name ?? user.email ?? '').trim(),
        fromEmail: saved.replyEmail,
      })
      .catch(() => {});

    return {
      id: (saved._id as ObjectId).toHexString(),
      type: saved.type,
      state: saved.state,
      text: saved.text,
      writer: (user.name ?? user.email ?? '').trim(),
      replyEmail: saved.replyEmail ?? '',
      createdAt: saved.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private async enrichWithWriter(
    rows: ComplainsEntity[],
  ): Promise<ComplainsInterface[]> {
    const idHexes = Array.from(
      new Set(
        rows
          .map((r) => (r.userId as ObjectId)?.toHexString?.())
          .filter((v): v is string => Boolean(v)),
      ),
    );

    const ids = idHexes.map((hex) => new ObjectId(hex));

    const users = ids.length
      ? await this.users.find({ where: { _id: { $in: ids } } as any })
      : [];

    const nameById = new Map(
      users.map((u) => [u._id.toHexString(), (u.name ?? '').trim()]),
    );

    return rows.map((r) => ({
      id: (r._id as ObjectId).toHexString(),
      type: r.type,
      state: r.state,
      text: r.text,
      writer: nameById.get((r.userId as ObjectId).toHexString()) ?? 'unknown',
      replyEmail: r.replyEmail ?? '',
      createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }));
  }

  async updateState(
    id: string,
    dto: UpdateComplainStateDto,
  ): Promise<ComplainsInterface> {
    if (!ObjectId.isValid(id))
      throw new BadRequestException('Invalid id format');
    const _id = new ObjectId(id);

    const row = await this.repo.findOne({ where: { _id } as any });
    if (!row) throw new NotFoundException('Complain not found');

    row.state = dto.state;
    const saved = await this.repo.save(row);

    const [withWriter] = await this.enrichWithWriter([saved]);
    return withWriter;
  }
}
