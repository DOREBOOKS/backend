import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PublisherAuthController } from './publisher-auth.controller';
import { PublisherAuthService } from './publisher-auth.service';
import { PublisherJwtStrategy } from './publisher-jwt.strategy';
import { PublishersModule } from 'src/publishers/publishers.module';
import { PublisherJwtAuthGuard } from './publisher-jwt.guard';

@Module({
  imports: [
    PublishersModule,
    PassportModule.register({ defaultStrategy: 'publisher-jwt' }),
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is missing');
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [PublisherAuthController],
  providers: [
    PublisherAuthService,
    PublisherJwtStrategy,
    PublisherJwtAuthGuard,
  ],
  exports: [PublisherAuthService, PublisherJwtAuthGuard],
})
export class PublisherAuthModule {}
