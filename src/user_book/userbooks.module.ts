import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBooksEntity } from './entities/userbooks.entity';
import { UserBooksService } from './service/userbooks.service';
import { UserBooksController } from './controller/userbooks.controller';
import { DealsModule } from 'src/deal/deals.module';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBooksEntity]),
    forwardRef(() => DealsModule),
    forwardRef(() => AlertsModule),
  ],
  controllers: [UserBooksController],
  providers: [UserBooksService],
  exports: [UserBooksService, TypeOrmModule],
})
export class UserBooksModule {}
