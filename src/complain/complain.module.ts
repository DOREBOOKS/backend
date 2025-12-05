import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplainsEntity } from './entity/complains.entity';
import { ComplainsService } from './service/complains.service';
import { ComplainsController } from './controller/complains.controller';
import { MailModule } from 'src/mail/mail.module';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplainsEntity, UserEntity]),
    MailModule,
  ],
  providers: [ComplainsService],
  controllers: [ComplainsController],
})
export class ComplainsModule {}
