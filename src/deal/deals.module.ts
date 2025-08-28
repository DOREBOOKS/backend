import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsEntity } from './entity/deals.entity';
import { DealsService } from './service/deals.service';
import { DealsController } from './controller/deals.controller';
import { BooksModule } from 'src/books/books.module';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DealsEntity, UserBooksEntity]),
    BooksModule,
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [TypeOrmModule, DealsService],
})
export class DealsModule {}
