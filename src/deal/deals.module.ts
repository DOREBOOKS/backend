import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsEntity } from './entity/deals.entity';
import { DealsService } from './service/deals.service';
import { DealsController } from './controller/deals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DealsEntity])],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
