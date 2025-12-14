import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PublishersService } from 'src/publishers/service/publishers.service';

interface PublisherJwtPayload {
  sub: string; // publisherId
  type: 'PUBLISHER'; // 타입 구분
}

@Injectable()
export class PublisherJwtStrategy extends PassportStrategy(
  Strategy,
  'publisher-jwt',
) {
  constructor(private readonly publishersService: PublishersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: PublisherJwtPayload) {
    // 여기서 반환하는 값이 request.user 가 된다.
    const publisher = await this.publishersService.findOneById(payload.sub);
    if (!publisher) {
      // Passport가 자동으로 401 처리
      throw new UnauthorizedException();
    }
    return publisher;
  }
}
