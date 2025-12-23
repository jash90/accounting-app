import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from './company.entity';

@Entity('notification_settings')
@Unique(['companyId', 'userId', 'moduleSlug'])
@Index(['userId'])
@Index(['moduleSlug'])
@Index(['companyId'])
@Index(['companyId', 'moduleSlug'])
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  moduleSlug!: string;

  @Column({ default: true })
  receiveOnCreate!: boolean;

  @Column({ default: true })
  receiveOnUpdate!: boolean;

  @Column({ default: true })
  receiveOnDelete!: boolean;

  @Column({ default: false })
  isAdminCopy!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
