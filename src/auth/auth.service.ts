// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/service/users.service';
import { UserResponseDto } from 'src/users/dto/user-respnose.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { LoginDto, SignupDto } from './auth.dto';
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
      },
    };
  }

  // JWT 검증용: Guard에서 사용
  async validateUser(userId: string): Promise<UserInterface> {
    return this.usersService.findOne(userId);
  }
}
