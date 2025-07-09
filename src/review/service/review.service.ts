import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from '../entities/review.entity';
import { CreateReviewDto } from '../dto/review.dto';
import { ReviewInterface } from '../interfaces/review.interface';
import { ObjectId } from 'mongodb';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
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

  async create(createReviewDto: CreateReviewDto): Promise<ReviewInterface> {
    const review = this.reviewRepository.create({
      ...createReviewDto,
      bookId: new ObjectId(createReviewDto.bookId),
    });

    try {
      await this.reviewRepository.save(review);
      return this.mapToInterface(review);
    } catch (error: any) {
      // TODO : has to define error type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const code = error.code ?? error.driverError?.code;
      if (code === 11000) {
        throw new ConflictException('Duplicate review entry.');
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
      title: entity.title,
      comment: entity.comment,
      rating: entity.rating,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
