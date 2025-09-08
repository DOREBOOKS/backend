import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './controller/users.controller';
import { UsersService } from './service/users.service';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { DealsModule } from 'src/deal/deals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, DealsEntity]),
    forwardRef(() => DealsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
