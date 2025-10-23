import { NotificationSettings } from '../entities/user.entity';
export interface UserInterface {
  id: string;
  profilePic?: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
  bank?: string;
  bankAccount?: string;
  coin: number;
  password: string;
  gender?: 'male' | 'female';
  social: 'local' | 'kakao' | 'naver' | 'google' | 'apple';
  //notificationSettings?: NotificationSettings | null;
}
