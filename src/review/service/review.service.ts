import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReviewEntity } from '../entities/review.entity';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { ReviewInterface } from '../interfaces/review.interface';
import { ObjectId } from 'mongodb';
import { CreateReviewResult } from '../interfaces/create-review-result.interface';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';
import { GoodPoint } from 'src/common/constants/good-points.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(UserBooksEntity)
    private readonly userBookRepository: Repository<UserBooksEntity>,
  ) {}

  async findAll(): Promise<ReviewInterface[]> {
    const reviews = await this.reviewRepository.find();
    return reviews.map((review) => this.mapToInterface(review));
  }

  async findByBookId(bookId: string): Promise<ReviewInterface[]> {
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException('Invalid bookId format');
    }
    const objectId = new ObjectId(bookId);
    const reviews = await this.reviewRepository.find({
      where: { bookId: objectId },
    });
    return reviews.map((review) => this.mapToInterface(review));
  }

  async create(
    dto: CreateReviewDto,
    authUser: any,
  ): Promise<CreateReviewResult> {
    const { bookId, comment, goodPoints } = dto;

    const authIdHex =
      authUser?.id ?? authUser?._id ?? authUser?.sub ?? authUser?.userId;
    if (!authIdHex || !ObjectId.isValid(authIdHex)) {
      throw new BadRequestException('Invalid authenticated user');
    }
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException('Invalid bookId format');
    }

    const userObjectId = new ObjectId(authIdHex);
    const bookObjectId = new ObjectId(bookId);

    const user = await this.userRepository.findOneBy({ _id: userObjectId });
    if (!user) throw new NotFoundException(`User not found`);

    const owned = await this.userBookRepository.findOne({
      where: { userId: userObjectId, bookId: bookObjectId },
    });
    if (!owned)
      throw new ForbiddenException('You can only review books you purchased.');

    const existed = await this.reviewRepository.findOne({
      where: { bookId: bookObjectId, reviewerId: userObjectId },
    });
    if (existed) {
      const [mapped] = await this.enrichWithWriter([existed]);
      return { review: mapped, created: false };
    }

    const review = this.reviewRepository.create({
      bookId: bookObjectId,
      reviewerId: userObjectId,
      comment:
        typeof comment === 'string' ? comment.trim().slice(0, 1000) : undefined,

      writer: user.name,
      goodPoints: Array.isArray(goodPoints)
        ? Array.from(new Set(goodPoints)).slice(0, 5)
        : [],
    });

    try {
      await this.reviewRepository.save(review);
      const [mapped] = await this.enrichWithWriter([review]);
      return { review: mapped, created: true };
    } catch (error: any) {
      const code = error?.code ?? error?.driverError?.code;
      if (code === 11000) {
        const dup = await this.reviewRepository.findOne({
          where: { bookId: bookObjectId, reviewerId: userObjectId },
        });
        if (dup) {
          const [mapped] = await this.enrichWithWriter([dup]);
          return { review: mapped, created: false };
        }
      }
      throw error;
    }
  }

  async update(
    reviewId: string,
    dto: UpdateReviewDto,
    authUser: any,
  ): Promise<ReviewInterface> {
    if (!ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid reviewId format');
    }
    const authIdHex =
      authUser?.id ?? authUser?._id ?? authUser?.sub ?? authUser?.userId;
    if (!authIdHex || !ObjectId.isValid(authIdHex)) {
      throw new BadRequestException('Invalid authenticated user');
    }

    const reviewObjectId = new ObjectId(reviewId);
    const userObjectId = new ObjectId(authIdHex);

    const review = await this.reviewRepository.findOne({
      where: { _id: reviewObjectId },
    });
    if (!review)
      throw new NotFoundException(`Review with id ${reviewId} not found`);

    const ownerId =
      review.reviewerId instanceof ObjectId
        ? review.reviewerId
        : new ObjectId(String(review.reviewerId));

    if (!ownerId.equals(userObjectId)) {
      throw new ForbiddenException('본인이 작성한 리뷰만 수정할 수 있습니다.');
    }

    let touched = false;
    if (typeof dto.comment === 'string' && dto.comment !== review.comment) {
      review.comment = dto.comment.trim().slice(0, 1000);
      touched = true;
    }
    if (Array.isArray(dto.goodPoints)) {
      const next = Array.from(new Set(dto.goodPoints)).slice(0, 5);
      const sameLen = (review.goodPoints ?? []).length === next.length;
      const sameAll =
        sameLen && (review.goodPoints ?? []).every((v, i) => v === next[i]);
      if (!sameAll) {
        review.goodPoints = next as any;
        touched = true;
      }
    }

    if (touched) await this.reviewRepository.save(review);
    const [mapped] = await this.enrichWithWriter([review]);
    return mapped;
  }

  async delete(reviewId: string, authUser: any): Promise<{ message: string }> {
    if (!ObjectId.isValid(reviewId)) {
      throw new BadRequestException('Invalid reviewId format.');
    }
    const authIdHex =
      authUser?.id ?? authUser?._id ?? authUser?.sub ?? authUser?.userId;
    if (!authIdHex || !ObjectId.isValid(authIdHex)) {
      throw new BadRequestException('Invalid authenticated user');
    }

    const _id = new ObjectId(reviewId);
    const review = await this.reviewRepository.findOne({ where: { _id } });
    if (!review)
      throw new NotFoundException(`Review with id ${reviewId} not found`);

    const ownerId =
      review.reviewerId instanceof ObjectId
        ? review.reviewerId
        : new ObjectId(String(review.reviewerId));
    if (!ownerId.equals(new ObjectId(authIdHex))) {
      throw new ForbiddenException('본인이 작성한 리뷰만 삭제할 수 있습니다.');
    }

    await this.reviewRepository.delete({ _id });
    return { message: `Review with id ${reviewId} deleted successfully` };
  }

  private async enrichWithWriter(
    rows: ReviewEntity[],
  ): Promise<ReviewInterface[]> {
    const idHexes = Array.from(
      new Set(
        rows
          .map(
            (r) =>
              (r.reviewerId as any)?.toHexString?.() ??
              String(r.reviewerId ?? ''),
          )
          .filter(Boolean),
      ),
    );

    const ids = idHexes
      .filter(ObjectId.isValid)
      .map((hex) => new ObjectId(hex));

    const users = ids.length
      ? await this.userRepository.find({ where: { _id: { $in: ids } } as any })
      : [];

    const nameById = new Map(
      users.map((u) => [u._id.toHexString(), (u.name ?? '').trim()]),
    );

    return rows.map((r) => {
      const reviewerHex =
        (r.reviewerId as any)?.toHexString?.() ?? String(r.reviewerId ?? '');
      const writer = nameById.get(reviewerHex) ?? r.writer ?? 'unknown';

      return {
        id: r._id.toHexString(),
        bookId: (r.bookId as any)?.toHexString?.() ?? String(r.bookId),
        userId: reviewerHex,
        writer,
        comment: r.comment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        goodPoints: r.goodPoints ?? [],
      };
    });
  }

  private mapToInterface(entity: ReviewEntity): ReviewInterface {
    const reviewerHex =
      (entity.reviewerId as any)?.toHexString?.() ??
      String(entity.reviewerId ?? '');
    return {
      id: entity._id.toHexString(),
      bookId: entity.bookId.toHexString(),
      userId: reviewerHex,
      writer: entity.writer,
      comment: entity.comment,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      goodPoints: entity.goodPoints ?? [],
    };
  }
}
