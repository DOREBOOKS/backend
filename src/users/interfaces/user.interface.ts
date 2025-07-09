export interface UserInterface {
  id: string;
  profilePic?: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
  point: string;
  password: string;
  gender?: 'male' | 'female';
  social?: 'local' | 'kakao' | 'naver' | 'google' | 'apple';
}
