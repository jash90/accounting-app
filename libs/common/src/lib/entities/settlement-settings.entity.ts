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

export interface AutoAssignRule {
  clientId: string;
  userId: string;
  isDefault?: boolean;
}

@Entity('settlement_settings')
@Index(['companyId'])
@Unique(['companyId']) // One settings record per company
export class SettlementSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant
  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  // Default priority for new settlements (0 = normal)
  @Column({ type: 'smallint', default: 0 })
  defaultPriority!: number;

  // Day of month for automatic deadline (null = no automatic deadline)
  @Column({ type: 'smallint', nullable: true })
  defaultDeadlineDay?: number | null;

  // Auto-assign settings
  @Column({ type: 'boolean', default: false })
  autoAssignEnabled!: boolean;

  // JSON rules: [{clientId, userId, isDefault?}]
  @Column({ type: 'jsonb', nullable: true })
  autoAssignRules?: AutoAssignRule[] | null;

  // Notification settings
  @Column({ type: 'boolean', default: true })
  notifyOnStatusChange!: boolean;

  @Column({ type: 'boolean', default: true })
  notifyOnDeadlineApproaching!: boolean;

  // Number of days before deadline to send warning notification
  @Column({ type: 'smallint', default: 3 })
  deadlineWarningDays!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
