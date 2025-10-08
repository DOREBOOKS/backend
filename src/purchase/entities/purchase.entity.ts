import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  purchaseToken: string;

  @Column()
  userId: string;

  @Column()
  packageName: string;

  @CreateDateColumn()
  purchaseTime: Date;

  @Column({ nullable: true })
  developerPayload: string;
}
