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

@Entity('token_limits')
@Index(['companyId', 'userId'], { unique: true })
export class TokenLimit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.tokenLimits, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // User-specific limit (nullable for company-wide limits)
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  // Limit configuration
  @Column({ type: 'int' })
  monthlyLimit!: number;

  @Column({ type: 'int', default: 80 })
  warningThresholdPercentage!: number;

  // Notification settings
  @Column({ type: 'boolean', default: true })
  notifyOnWarning!: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnExceeded!: boolean;

  // Audit trail
  @Column({ type: 'uuid' })
  setById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'setById' })
  setBy!: User;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
