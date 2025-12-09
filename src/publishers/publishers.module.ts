import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishersEntity } from './entities/publishers.entity';
import { PublishersController } from './controller/publishers.controller';
import { PublishersService } from './service/publishers.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublishersEntity])],
  controllers: [PublishersController],
  providers: [PublishersService],
  exports: [PublishersService],
})
export class PublishersModule {}
