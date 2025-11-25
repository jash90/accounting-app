import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('token_limits')
@Index(['companyId', 'userId'], { unique: true })
export class TokenLimit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.tokenLimits, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // User-specific limit (nullable for company-wide limits)
  @Column({ nullable: true })
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
  @Column({ default: true })
  notifyOnWarning!: boolean;

  @Column({ default: true })
  notifyOnExceeded!: boolean;

  // Audit trail
  @Column()
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
