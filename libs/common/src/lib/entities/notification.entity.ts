import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { User } from './user.entity';
import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationDataItem {
  id: string;
  title: string;
  actionUrl?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface NotificationData {
  entityId?: string;
  entityType?: string;
  items?: NotificationDataItem[];
  [key: string]: unknown;
}

@Entity('notifications')
@Index(['recipientId', 'isRead', 'isArchived'])
@Index(['recipientId', 'createdAt'])
@Index(['companyId'])
@Index(['type'])
@Index(['moduleSlug'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient!: User;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'varchar', length: 100 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 100 })
  moduleSlug!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data!: NotificationData | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isArchived!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  emailSent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor!: User | null;

  @Column({ type: 'boolean', default: false })
  isBatch!: boolean;

  @Column({ type: 'int', default: 1 })
  itemCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
