import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { HeartInterestEntity } from './entities/heart-interest.entity';
import { NoticeInterestEntity } from './entities/notice-interest';
import { NotificationEntity } from './entities/notification.entity';

import { HeartInterestsService } from './services/heart-interests.service';
import { NoticeInterestsService } from './services/notice-interests';
import { NotificationsService } from './services/notifications.service';

import { BookInterestsController } from './controllers/book-interest.controller';
import { NotificationsController } from './controllers/notifications.controller';

import { BookRegisteredListener } from './listeners/book-registered.listener';
import { UserBooksModule } from 'src/user_book/userbooks.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      HeartInterestEntity,
      NoticeInterestEntity,
      NotificationEntity,
    ]),
    UserBooksModule,
  ],
  providers: [
    HeartInterestsService,
    NoticeInterestsService,
    NotificationsService,
    BookRegisteredListener,
  ],
  controllers: [BookInterestsController, NotificationsController],
  exports: [
    HeartInterestsService,
    NoticeInterestsService,
    NotificationsService,
  ],
})
export class AlertsModule {}
