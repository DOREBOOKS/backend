export interface UserInterface {
  id: string;
  password: string;
  name: string;
  email: string;
  age?: number;
  gender?: 'male' | 'female';
  social?: 'local' | 'kakao' | 'naver' | 'google' | 'apple';
  createdAt: Date;
  updatedAt: Date;
}
