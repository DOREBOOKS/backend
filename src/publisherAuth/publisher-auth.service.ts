import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PublishersService } from 'src/publishers/service/publishers.service';
import { PublishersInterface } from 'src/publishers/interfaces/publishers.interface';

@Injectable()
export class PublisherAuthService {
  constructor(
    private readonly publishersService: PublishersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: {
    loginId: string;
    password: string;
  }): Promise<{ accessToken: string; publisher: PublishersInterface }> {
    // 1) 엔티티로 바로 조회 (비밀번호 포함)
    const publisherEntity = await this.publishersService.findEntityByLoginId(
      dto.loginId,
    );

    console.log('[publisher login] loginId=', dto.loginId);
    console.log('[publisher login] found=', !!publisherEntity);

    if (!publisherEntity) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 2) 비밀번호 비교
    const isValid = await bcrypt.compare(
      dto.password,
      publisherEntity.password,
    );
    if (!isValid) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 3) JWT payload 생성
    const payload = {
      sub: publisherEntity._id.toHexString(),
      type: 'PUBLISHER',
    };

    const accessToken = this.jwtService.sign(payload);

    // 4) 외부로 내보낼 safe한 publisher 정보 (인터페이스로 변환)
    const safePublisher = this.publishersService.toInterface(publisherEntity);

    return {
      accessToken,
      publisher: safePublisher,
    };
  }
}
