import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RelationsEntity } from './entities/relations.entity';
import { RelationsService } from './service/relations.service';
import { RelationsController } from './controller/relations.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([RelationsEntity]), MailModule],
  providers: [RelationsService],
  controllers: [RelationsController],
  exports: [RelationsService],
})
export class RelationsModule {}
