import { ObjectId } from 'mongodb';
import {
  Entity,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// @Index('IDX_USER_EMAIL', ['email'], { unique: true })

export class NotificationSettings {
  // 홈 화면에서 쓰는 마스터 스위치
  marketingConsent: boolean; // 광고성 정보 수신 마스터 동의
  nightConsent: boolean; // 야간 수신 동의

  // 채널별 동의
  channels: {
    push: boolean; // 앱 푸시
    sms: boolean;
    email: boolean;
  };

  // 푸시 내 세부 토픽
  pushTopics: {
    bookRegister: boolean; // 도서 등록 알림
    otherMarketing: boolean; // 기타 마케팅 알림
  };

  // 클라이언트 편의를 위한 요약
  summary: {
    anyOn: boolean; // 하위 항목 중 하나라도 켜져 있나
    allOn: boolean; // 하위 leaf가 모두 켜져 있나
    updatedAt: Date;
  };
}

@Entity('users')
export class UserEntity {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  name: string;

  @Column({ nullable: true })
  profilePic: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ nullable: true })
  bank: string;

  @Column({ nullable: true })
  bankAccount: string;

  @Column()
  social: 'local' | 'kakao' | 'naver' | 'google' | 'apple';

  @Column()
  gender?: 'male' | 'female';

  @CreateDateColumn()
  birth: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  coin: number;

  @Column({ type: 'simple-json', nullable: true })
  notificationSettings?: NotificationSettings;

  @Column()
  state: 'active' | 'inactive';
}
