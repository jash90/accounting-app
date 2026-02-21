import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Client } from './client.entity';
import { Company } from './company.entity';
import type { SettlementComment } from './settlement-comment.entity';
import { User } from './user.entity';
import { SettlementStatus } from '../enums/settlement-status.enum';

export interface SettlementStatusHistoryEntry {
  status: SettlementStatus;
  changedAt: string;
  changedById: string;
  changedByEmail?: string;
  notes?: string;
}

@Entity('monthly_settlements')
@Index(['companyId'])
@Index(['companyId', 'month', 'year'])
@Index(['companyId', 'userId', 'month', 'year'])
@Unique(['companyId', 'clientId', 'month', 'year'])
export class MonthlySettlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  assignedUser?: User | null;

  @Column({ type: 'uuid', nullable: true })
  assignedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedById' })
  assignedBy?: User | null;

  @Column({ type: 'smallint' })
  month!: number;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status!: SettlementStatus;

  @Column({ type: 'date', nullable: true })
  documentsDate?: Date | null;

  @Column({ type: 'int', default: 0 })
  invoiceCount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  settledById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'settledById' })
  settledBy?: User | null;

  @Column({ type: 'smallint', default: 0 })
  priority!: number;

  @Column({ type: 'date', nullable: true })
  deadline?: Date | null;

  @Column({ type: 'boolean', default: false })
  documentsComplete!: boolean;

  @Column({ type: 'boolean', default: false })
  requiresAttention!: boolean;

  @Column({ type: 'varchar', nullable: true })
  attentionReason?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  statusHistory?: SettlementStatusHistoryEntry[] | null;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @OneToMany('SettlementComment', 'settlement')
  comments?: SettlementComment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
