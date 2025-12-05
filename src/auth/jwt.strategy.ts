// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { UserInterface } from '../users/interfaces/user.interface';

export interface JwtPayload {
  sub: string; // 사용자 ID
  email: string; // 사용자 이메일
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JwtPayload): Promise<UserInterface> {
    // payload.sub 에 사용자 ID
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      // Passport가 자동으로 401 처리
      throw new UnauthorizedException();
    }
    return user;
  }
}
