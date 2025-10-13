import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from './entities/book.entity';
import { BooksService } from './service/book.service';
import { BooksController } from './controller/book.controller';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { ReviewEntity } from 'src/review/entities/review.entity';
import { DealsModule } from 'src/deal/deals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookEntity,
      DealsEntity,
      UserEntity,
      ReviewEntity,
    ]),
    forwardRef(() => DealsModule),
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
