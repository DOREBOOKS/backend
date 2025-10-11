import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from './entities/book.entity';
import { BooksService } from './service/book.service';
import { BooksController } from './controller/book.controller';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReviewEntity } from 'src/review/entities/review.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookEntity,
      DealsEntity,
      UserEntity,
      ReviewEntity,
    ]),
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
