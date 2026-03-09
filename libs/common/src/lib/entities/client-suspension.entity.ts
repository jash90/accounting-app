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

/**
 * Entity tracking client suspension history.
 * Each record represents a suspension period with optional end date.
 */
@Entity('client_suspensions')
@Index(['companyId'])
@Index(['clientId'])
@Index(['companyId', 'clientId'])
@Index(['startDate'])
@Index(['endDate'])
export class ClientSuspension {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.suspensions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  /**
   * Date when the suspension starts (required).
   */
  @Column({ type: 'date' })
  startDate!: Date;

  /**
   * Date when the suspension ends / client resumes (optional).
   * Can be set at creation time or updated later.
   */
  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  /**
   * Reason for the suspension (optional).
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  // Notification tracking flags to prevent duplicate notifications

  /**
   * Whether the 7-day reminder before suspension start has been sent.
   */
  @Column({ type: 'boolean', default: false })
  startDate7DayReminderSent!: boolean;

  /**
   * Whether the 1-day reminder before suspension start has been sent.
   */
  @Column({ type: 'boolean', default: false })
  startDate1DayReminderSent!: boolean;

  /**
   * Whether the 7-day reminder before suspension end has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate7DayReminderSent!: boolean;

  /**
   * Whether the 1-day reminder before suspension end has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate1DayReminderSent!: boolean;

  /**
   * Whether the resumption notification (on endDate) has been sent to the owner.
   */
  @Column({ type: 'boolean', default: false })
  resumptionNotificationSent!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
