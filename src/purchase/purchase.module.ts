import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseController } from './controller/purchase.controller';
import { PurchaseService } from './service/purchase.service';
import { Purchase } from './entities/purchase.entity';
import { DealsModule } from 'src/deal/deals.module';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase]), DealsModule],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [TypeOrmModule],
})
export class PurchaseModule {}
