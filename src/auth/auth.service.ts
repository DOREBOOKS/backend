// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/service/users.service';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { LoginDto, SignupDto } from './auth.dto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 로그인 시도: 사용자 인증 & JWT 발급
  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { email, password } = dto;
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        coin: user.coin,
      },
    };
  }

  async signup(
    dto: SignupDto,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    // 1) 이미 존재하는 username인지 체크
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('email already taken');
    }

    // 2) 비밀번호 해싱
    const saltRounds = 10;
    const hash = await bcrypt.hash(dto.password, saltRounds);

    // 3) 유저 생성
    const user = await this.usersService.create({
      ...dto,
      password: hash,
      social: 'local',
    });

    // 4) 토큰 발급 (자동 로그인)
    const payload = { sub: user.id, name: user.name };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        coin: user.coin,
      },
    };
  }

  // JWT 검증용: Guard에서 사용
  async validateUser(userId: string): Promise<UserInterface> {
    return this.usersService.findOne(userId);
  }

  async oauthExchange(
    provider: 'google' | 'kakao',
    body,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { idToken, accessToken } = body;
    let identity: {
      provider: 'google' | 'kakao';
      providerUserId: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (provider === 'google') {
      if (!idToken) {
        throw new UnauthorizedException('No idToken provided');
      }
      const JWKS = createRemoteJWKSet(
        new URL('https://www.googleapis.com/oauth2/v3/certs'),
      );
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const { sub, email, name, picture } = payload;

      identity = {
        provider: 'google',
        providerUserId: sub as string,
        email: email as string,
        name: name as string,
        picture: picture as string,
      };
    }
    // else if (provider === 'kakao') {
    //   // TODO
    // }
    else {
      throw new UnauthorizedException('Unsupported provider');
    }

    if (!identity.email) {
      throw new UnauthorizedException('No email found from provider');
    }
    const user = await this.usersService.findByProvider(
      identity.provider,
      identity.email,
    );
    if (user) {
      // 이미 가입된 유저 -> 로그인 처리
      const payload = { sub: user.id, email: user.email };
      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          gender: user.gender,
          age: user.age,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          coin: user.coin,
        },
      };
    }
    // 신규 유저 -> 회원가입 처리
    const newUser = await this.usersService.create({
      name: identity.name || '',
      email: identity.email || '',
      profilePic: identity.picture || '',
      social: identity.provider,
      password: Math.random().toString(36).slice(-8), // 랜덤 비밀번호 생성
    });
    const payload = { sub: newUser.id, email: newUser.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        gender: newUser.gender,
        age: newUser.age,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        coin: newUser.coin,
      },
    };
  }

  async removeUser(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('no user');
    return await this.usersService.update(userId, {
      ...user,
      state: 'invalid',
    });
  }
}
