import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsEntity } from './entity/deals.entity';
import { DealsService } from './service/deals.service';
import { DealsController } from './controller/deals.controller';
import { BooksModule } from 'src/books/books.module';
import { UserBooksEntity } from 'src/user_book/entities/userbooks.entity';
import { BookOrDealRegisteredListener } from 'src/alerts/listeners/book-or-deal-regitered.listener';
import { AlertsModule } from 'src/alerts/alerts.module';
import { UserBooksModule } from 'src/user_book/userbooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DealsEntity, UserBooksEntity]),
    //forwardRef(() => AlertsModule),
    forwardRef(() => UserBooksModule),
    BooksModule,
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [TypeOrmModule, DealsService],
})
export class DealsModule {}
