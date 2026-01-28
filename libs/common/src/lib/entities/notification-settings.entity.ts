import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { User } from './user.entity';
import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationTypePreference {
  inApp: boolean;
  email: boolean;
}

export type NotificationTypePreferences = Partial<
  Record<NotificationType, NotificationTypePreference>
>;

@Entity('notification_settings')
@Unique(['companyId', 'userId', 'moduleSlug'])
@Index(['userId'])
@Index(['moduleSlug'])
@Index(['companyId'])
@Index(['companyId', 'moduleSlug'])
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'varchar' })
  moduleSlug!: string;

  @Column({ type: 'boolean', default: true })
  inAppEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  emailEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  receiveOnCreate!: boolean;

  @Column({ type: 'boolean', default: true })
  receiveOnUpdate!: boolean;

  @Column({ type: 'boolean', default: true })
  receiveOnDelete!: boolean;

  @Column({ type: 'boolean', default: true })
  receiveOnTaskCompleted!: boolean;

  @Column({ type: 'boolean', default: true })
  receiveOnTaskOverdue!: boolean;

  @Column({ type: 'boolean', default: false })
  isAdminCopy!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  typePreferences!: NotificationTypePreferences | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
