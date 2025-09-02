import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplainsEntity } from './entity/complains.entity';
import { ComplainsService } from './service/complains.service';
import { ComplainsController } from './controller/complains.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([ComplainsEntity]), MailModule],
  providers: [ComplainsService],
  controllers: [ComplainsController],
})
export class ComplainsModule {}
