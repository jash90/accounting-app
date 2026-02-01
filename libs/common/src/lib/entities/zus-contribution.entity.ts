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

import { Client } from './client.entity';
import { Company } from './company.entity';
import { User } from './user.entity';
import { ZusContributionStatus } from '../enums/zus-contribution-status.enum';
import { ZusDiscountType } from '../enums/zus-discount-type.enum';

/**
 * ZUS Contribution - monthly social insurance contribution record
 * Rozliczenie składek ZUS za dany miesiąc
 */
@Entity('zus_contributions')
@Index(['companyId'])
@Index(['clientId'])
@Index(['companyId', 'clientId'])
@Index(['periodMonth', 'periodYear'])
@Index(['companyId', 'periodMonth', 'periodYear'])
@Index(['status'])
@Index(['dueDate'])
export class ZusContribution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  /** Month of the contribution period (1-12) */
  @Column({ type: 'int' })
  periodMonth!: number;

  /** Year of the contribution period */
  @Column({ type: 'int' })
  periodYear!: number;

  @Column({
    type: 'enum',
    enum: ZusContributionStatus,
    default: ZusContributionStatus.DRAFT,
  })
  status!: ZusContributionStatus;

  /** Due date for payment (10th, 15th, or 20th of following month) */
  @Column({ type: 'date' })
  dueDate!: Date;

  /** Actual payment date */
  @Column({ type: 'date', nullable: true })
  paidDate?: Date;

  // ============================================
  // Contribution amounts (stored in grosze - 1/100 PLN for precision)
  // Kwoty składek (w groszach dla precyzji)
  // ============================================

  /** Składka emerytalna - 19.52% */
  @Column({ type: 'int', default: 0 })
  retirementAmount!: number;

  /** Składka rentowa - 8% */
  @Column({ type: 'int', default: 0 })
  disabilityAmount!: number;

  /** Składka chorobowa - 2.45% (dobrowolna) */
  @Column({ type: 'int', default: 0 })
  sicknessAmount!: number;

  /** Składka wypadkowa - 1.67% */
  @Column({ type: 'int', default: 0 })
  accidentAmount!: number;

  /** Fundusz Pracy - 2.45% */
  @Column({ type: 'int', default: 0 })
  laborFundAmount!: number;

  /** Składka zdrowotna - variable rate */
  @Column({ type: 'int', default: 0 })
  healthAmount!: number;

  /** Sum of social contributions (without health) */
  @Column({ type: 'int', default: 0 })
  totalSocialAmount!: number;

  /** Grand total (social + health) */
  @Column({ type: 'int', default: 0 })
  totalAmount!: number;

  // ============================================
  // Calculation basis (in grosze)
  // Podstawy wymiaru składek
  // ============================================

  /** Basis for social contributions */
  @Column({ type: 'int' })
  socialBasis!: number;

  /** Basis for health contribution (usually monthly income) */
  @Column({ type: 'int' })
  healthBasis!: number;

  /** Type of ZUS discount applied */
  @Column({ type: 'enum', enum: ZusDiscountType })
  discountType!: ZusDiscountType;

  /** Whether voluntary sickness insurance is opted in */
  @Column({ type: 'boolean', default: false })
  sicknessOptedIn!: boolean;

  /** Additional notes */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // Audit fields
  // ============================================

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
