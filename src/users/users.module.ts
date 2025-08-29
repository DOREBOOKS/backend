import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './controller/users.controller';
import { UsersService } from './service/users.service';
import { DealsEntity } from 'src/deal/entity/deals.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, DealsEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
