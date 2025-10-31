import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { RelationsEntity, RelationType } from '../entities/relations.entity';
import { MailService } from 'src/mail/service/mail.service';

@Injectable()
export class RelationsService {
  constructor(
    @InjectRepository(RelationsEntity)
    private readonly relationRepo: MongoRepository<RelationsEntity>,
    private readonly mailService: MailService,
  ) {}

  private checkObjectId(id?: string) {
    if (!id || !ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new ObjectId(id);
  }

  async block(ownerId: string, targetId: string) {
    const owner = this.checkObjectId(ownerId);
    const target = this.checkObjectId(targetId);

    if (owner.equals(target))
      throw new BadRequestException('Cannot block yourself');

    const exists = await this.relationRepo.findOne({
      where: {
        ownerId: owner,
        targetId: target,
        type: 'BLOCK',
      },
    });
    if (exists) throw new ConflictException('Already blocked');

    await this.relationRepo.save(
      this.relationRepo.create({
        _id: new ObjectId(),
        ownerId: owner,
        targetId: target,
        type: 'BLOCK',
        createdAt: new Date(),
      }),
    );
    return { blocked: true };
  }

  async unblock(ownerId: string, targetId: string) {
    const owner = this.checkObjectId(ownerId);
    const target = this.checkObjectId(targetId);
    const { deletedCount } = await this.relationRepo.deleteOne({
      ownerId: owner,
      targetId: target,
      type: 'BLOCK',
    });
    if (!deletedCount) throw new NotFoundException('Block relation not found');
    return { blocked: false };
  }

  async listBlocked(ownerId: string) {
    const owner = this.checkObjectId(ownerId);
    const rows = await this.relationRepo.find({
      where: { ownerId: owner, type: 'BLOCK' },
    });
    return rows.map((r) => ({
      id: r._id.toHexString(),
      targetId: r.targetId.toHexString(),
      createdAt: r.createdAt,
    }));
  }

  async isBlocked(viewerId: string, authorId: string) {
    const viewer = this.checkObjectId(viewerId);
    const author = this.checkObjectId(authorId);
    return !!(await this.relationRepo.findOne({
      where: { ownerId: viewer, targetId: author, type: 'BLOCK' },
    }));
  }

  async report(
    ownerId: string,
    targetId: string,
    text: string,
    reason?: string,
    contextId?: string,
  ) {
    const owner = this.checkObjectId(ownerId);
    const target = this.checkObjectId(targetId);

    if (owner.equals(target)) {
      throw new BadRequestException('Cannot report yourself');
    }

    if (!contextId) {
      throw new BadRequestException('contextId is required for review report');
    }

    const ctx = this.checkObjectId(contextId);

    const exists = await this.relationRepo.findOne({
      where: {
        ownerId: owner,
        contextId: ctx,
        type: 'REPORT',
      },
    });
    if (exists) {
      throw new ConflictException('Already reported review');
    }

    const ownerHex = owner.toHexString();
    const targetHex = target.toHexString();
    const ctxHex = ctx?.toHexString();

    await this.relationRepo.save(
      this.relationRepo.create({
        _id: new ObjectId(),
        ownerId: owner,
        targetId: target,
        text: text.trim(),
        reason: reason?.trim(),
        contextId: ctx,
        type: 'REPORT',
        createdAt: new Date(),
      }),
    );

    await this.mailService.sendReportNotice({
      owner: ownerHex,
      target: targetHex,
      reason,
      text,
      contextId: ctxHex,
    });

    return { reported: true };
  }
}
