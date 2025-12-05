import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { HeartInterestEntity } from './entities/heart-interest.entity';
import { BookEntity } from 'src/books/entities/book.entity';
import { NoticeInterestEntity } from './entities/notice-interest';
import { NotificationEntity } from './entities/notification.entity';

import { HeartInterestsService } from './services/heart-interests.service';
import { NoticeInterestsService } from './services/notice-interests';
import { NotificationsService } from './services/notifications.service';

import { BookInterestsController } from './controllers/book-interest.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { BookOrDealRegisteredListener } from './listeners/book-or-deal-regitered.listener';
import { UserBooksModule } from 'src/user_book/userbooks.module';
import { BooksModule } from 'src/books/books.module';
import { DealsModule } from 'src/deal/deals.module';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { DevicesService } from './services/devices.service';
import { FcmService } from './services/fcm.service';
import { DevicesController } from './controllers/device.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HeartInterestEntity,
      BookEntity,
      NoticeInterestEntity,
      NotificationEntity,
      DeviceTokenEntity,
    ]),
    forwardRef(() => UserBooksModule),
    forwardRef(() => DealsModule),
    BooksModule,
  ],
  providers: [
    HeartInterestsService,
    NoticeInterestsService,
    NotificationsService,
    BookOrDealRegisteredListener,
    DevicesService,
    FcmService,
  ],
  controllers: [
    BookInterestsController,
    NotificationsController,
    DevicesController,
  ],
  exports: [
    HeartInterestsService,
    NoticeInterestsService,
    NotificationsService,
    DevicesService,
  ],
})
export class AlertsModule {}
