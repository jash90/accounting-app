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
import { ReliefType } from '../enums/relief-type.enum';
import { Client } from './client.entity';
import { Company } from './company.entity';
import { User } from './user.entity';

/**
 * Entity tracking client relief periods (ulgi).
 * Each record represents a relief period with a specific type and date range.
 *
 * Relief types:
 * - ULGA_NA_START: 6-month relief for new businesses
 * - MALY_ZUS: 36-month reduced ZUS contributions
 */
@Entity('client_relief_periods')
@Index(['companyId'])
@Index(['clientId'])
@Index(['companyId', 'clientId'])
@Index(['endDate'])
@Index(['reliefType'])
export class ClientReliefPeriod {
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

  /**
   * Type of relief (ULGA_NA_START or MALY_ZUS).
   */
  @Column({
    type: 'enum',
    enum: ReliefType,
  })
  reliefType!: ReliefType;

  /**
   * Date when the relief period starts (required).
   */
  @Column({ type: 'date' })
  startDate!: Date;

  /**
   * Date when the relief period ends (required).
   * Auto-calculated based on reliefType duration or manually set.
   */
  @Column({ type: 'date' })
  endDate!: Date;

  /**
   * Whether this relief is currently active.
   * Can be used to manually deactivate a relief before its end date.
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Notification tracking flags to prevent duplicate notifications

  /**
   * Whether the 7-day reminder before relief end has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate7DayReminderSent!: boolean;

  /**
   * Whether the 1-day reminder before relief end has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate1DayReminderSent!: boolean;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
