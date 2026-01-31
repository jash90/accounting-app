import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { MonthlySettlement } from './monthly-settlement.entity';
import { User } from './user.entity';

@Entity('settlement_comments')
@Index(['settlementId'])
@Index(['companyId'])
export class SettlementComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  settlementId!: string;

  @ManyToOne(() => MonthlySettlement, (settlement) => settlement.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'settlementId' })
  settlement!: MonthlySettlement;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'boolean', default: true })
  isInternal!: boolean;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @CreateDateColumn()
  createdAt!: Date;
}
