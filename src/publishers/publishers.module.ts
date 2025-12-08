import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublisherEntity } from './entities/publishers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublisherEntity])],
})
export class HistoryModule {}
