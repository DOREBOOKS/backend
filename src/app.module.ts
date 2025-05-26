// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { ReviewsModule } from './review/review.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGO_URI,
      database: process.env.MONGO_DB_NAME,
      synchronize: true,
      // entities: [__dirname + '/**/*.entity.ts'],
      autoLoadEntities: true,
    }),
    UsersModule,
    BooksModule,
    ReviewsModule,
  ],
})
export class AppModule {}
