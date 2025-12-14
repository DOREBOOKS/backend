import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { DealsModule } from './deal/deals.module';
import { UserBooksModule } from './user_book/userbooks.module';
import { ReviewsModule } from './review/review.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ComplainsModule } from './complain/complain.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AlertsModule } from './alerts/alerts.module';
import { HistoryModule } from './history/history.module';
import { PurchaseModule } from './purchase/purchase.module';
import { RelationsModule } from './user_relation/relations.module';
import { OldDealsModule } from './deal/old-deals.module';
import { PublishersModule } from './publishers/publishers.module';
// import { PublisherSettlementModule } from './publisherSettlement/publisherSettlement.module';
import { PublisherAuthModule } from './publisherAuth/publisher-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGO_URI,
      database: process.env.MONGO_DB_NAME,
      synchronize: true,
      // entities: [__dirname + '/**/*.entity.ts'],
      autoLoadEntities: true,
    }),
    UsersModule,
    BooksModule,
    DealsModule,
    UserBooksModule,
    ReviewsModule,
    AuthModule,
    PublisherAuthModule,
    MailModule,
    ComplainsModule,
    EventEmitterModule.forRoot(),
    AlertsModule,
    HistoryModule,
    PurchaseModule,
    RelationsModule,
    OldDealsModule,
    PublishersModule,
    // PublisherSettlementModule,
  ],
})
export class AppModule {}
