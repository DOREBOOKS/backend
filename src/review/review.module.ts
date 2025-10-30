import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './service/review.service';
import { ReviewsController } from './controller/review.controller';
import { UsersModule } from 'src/users/users.module';
import { UserBooksModule } from 'src/user_book/userbooks.module';
import { RelationsModule } from 'src/user_relation/relations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity]),
    UsersModule,
    UserBooksModule,
    RelationsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
