import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsEntity } from 'src/deal/entity/deals.entity';
import { BookEntity } from 'src/books/entities/book.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { OldDealsService } from './service/old-deals.service';
import { OldDealsController } from './controller/old-deals.controller';
import { RelationsModule } from 'src/user_relation/relations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DealsEntity, BookEntity, UserEntity]),
    forwardRef(() => RelationsModule),
  ],
  providers: [OldDealsService],
  controllers: [OldDealsController],
  exports: [OldDealsService],
})
export class OldDealsModule {}
