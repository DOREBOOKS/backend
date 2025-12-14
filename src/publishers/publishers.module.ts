import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishersEntity } from './entities/publishers.entity';
import { PublishersController } from './controller/publishers.controller';
import { PublishersService } from './service/publishers.service';
import { BookEntity } from 'src/books/entities/book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublishersEntity, BookEntity])],
  controllers: [PublishersController],
  providers: [PublishersService],
  exports: [PublishersService],
})
export class PublishersModule {}
