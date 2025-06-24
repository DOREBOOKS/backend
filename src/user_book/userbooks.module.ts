import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBooksEntity } from './entities/userbooks.entity';
import { UserBooksService } from './service/userbooks.service';
import { UserBooksController } from './controller/userbooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserBooksEntity])],
  controllers: [UserBooksController],
  providers: [UserBooksService],
})
export class UserBooksModule {}
