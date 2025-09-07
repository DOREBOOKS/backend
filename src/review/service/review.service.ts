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
import { ReviewInterface } from '../interfaces/review.interface';
import { ObjectId } from 'mongodb';
import { CreateReviewResult } from '../interfaces/create-review-result.interface';

import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';

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

  async create(createReviewDto: CreateReviewDto): Promise<CreateReviewResult> {
    const { userId, bookId, rating, comment } = createReviewDto;

    if (!ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    if (!ObjectId.isValid(bookId)) {
      throw new BadRequestException('Invalid bookId format');
    }

    const userObjectId = new ObjectId(userId);
    const bookObjectId = new ObjectId(bookId);

    const user = await this.userRepository.findOneBy({ _id: userObjectId });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const owned = await this.userBookRepository.findOne({
      where: { userId: userObjectId, bookId: bookObjectId },
    });
    if (!owned) {
      throw new ForbiddenException('You can only review books you purchased.');
    }

    const existed = await this.reviewRepository.findOne({
      where: { bookId: bookObjectId, userId: userObjectId },
    });
    if (existed) {
      return { review: this.mapToInterface(existed), created: false };
    }

    const review = this.reviewRepository.create({
      bookId: bookObjectId,
      userId: userObjectId,
      rating,
      comment,
      writer: user.name,
    });

    try {
      await this.reviewRepository.save(review);
      return { review: this.mapToInterface(review), created: true };
    } catch (error: any) {
      const code = error?.code ?? error?.driverError?.code;
      if (code === 11000) {
        const dup = await this.reviewRepository.findOne({
          where: { bookId: bookObjectId, userId: userObjectId },
        });
        if (dup) {
          return { review: this.mapToInterface(dup), created: false };
        }
      }
      throw error;
    }
  }

  async delete(reviewId: string): Promise<{ message: string }> {
    if (!ObjectId.isValid(reviewId)) {
      throw new BadRequestException(
        'Invalid reviewId format. Must be a 24-character hex string.',
      );
    }
    const objectId = new ObjectId(reviewId);
    const result = await this.reviewRepository.delete({ _id: objectId });

    if (result.affected === 0) {
      throw new NotFoundException(`Review with id ${reviewId} not found`);
    }
    return { message: `Review with id ${reviewId} deleted successfully` };
  }

  private mapToInterface(entity: ReviewEntity): ReviewInterface {
    return {
      id: entity._id.toHexString(),
      bookId: entity.bookId.toHexString(),
      writer: entity.writer,
      comment: entity.comment,
      rating: entity.rating,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
