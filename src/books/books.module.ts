import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookEntity } from './entities/book.entity';
import { BooksService } from './service/book.service';
import { BooksController } from './controller/book.controller';
import { DealsEntity } from 'src/deal/entity/deals.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookEntity, DealsEntity])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
