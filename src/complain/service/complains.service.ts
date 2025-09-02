import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ComplainsEntity } from '../entity/complains.entity';
import { CreateComplainsDto } from '../dto/complains.dto';
import { MailService } from 'src/mail/service/mail.service';
import { ObjectId } from 'mongodb';

@Injectable()
export class ComplainsService {
  constructor(
    @InjectRepository(ComplainsEntity)
    private readonly repo: MongoRepository<ComplainsEntity>,
    private readonly mailService: MailService,
  ) {}

  findAll() {
    return this.repo.find({ order: { _id: 'desc' as any } });
  }

  findByUserId(writer: string) {
    return this.repo.find({ where: { writer } });
  }

  async create(dto: CreateComplainsDto) {
    const entity = this.repo.create({
      type: dto.type,
      writer: dto.writer ?? 'anonymous',
      state: 'NEW',
      text: dto.text,
    });

    const saved = await this.repo.save(entity);

    //비동기 메일 발송(실패해도 저장은 유지)
    this.mailService
      .sendComplainNotice({
        id: (saved._id as ObjectId).toHexString(),
        type: saved.type,
        text: saved.text,
        writer: saved.writer,
        fromEmail: dto.fromEmail,
      })
      .catch(() => {});

    return saved;
  }
}
