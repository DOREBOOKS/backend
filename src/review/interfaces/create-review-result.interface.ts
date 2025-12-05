import { ReviewInterface } from './review.interface';

export interface CreateReviewResult {
  review: ReviewInterface;
  created: boolean;
}
