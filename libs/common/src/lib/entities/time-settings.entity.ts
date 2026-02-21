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
import { TimeRoundingMethod } from '../enums/time-rounding-method.enum';

@Entity('time_settings')
@Index(['companyId'])
@Unique(['companyId']) // One settings record per company
export class TimeSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Multi-tenant
  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  // Time rounding settings
  @Column({
    type: 'enum',
    enum: TimeRoundingMethod,
    default: TimeRoundingMethod.NONE,
  })
  roundingMethod!: TimeRoundingMethod;

  // Rounding interval in minutes (e.g., 15, 30, 60)
  @Column({ type: 'smallint', default: 15 })
  roundingIntervalMinutes!: number;

  // Default hourly rate for the company
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  defaultHourlyRate?: number;

  // Currency code (ISO 4217)
  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  defaultCurrency!: string;

  // Workflow settings
  @Column({ type: 'boolean', default: false })
  requireApproval!: boolean;

  @Column({ type: 'boolean', default: true })
  allowOverlappingEntries!: boolean;

  // Working hours settings (for timesheet views)
  @Column({ type: 'smallint', default: 8 })
  workingHoursPerDay!: number;

  @Column({ type: 'smallint', default: 40 })
  workingHoursPerWeek!: number;

  // First day of week (0 = Sunday, 1 = Monday, etc.)
  @Column({ type: 'smallint', default: 1 })
  weekStartDay!: number;

  // Timer settings
  @Column({ type: 'boolean', default: true })
  allowTimerMode!: boolean;

  @Column({ type: 'boolean', default: true })
  allowManualEntry!: boolean;

  // Auto-stop timer after X minutes (0 = disabled)
  @Column({ type: 'int', default: 0 })
  autoStopTimerAfterMinutes!: number;

  // Minimum entry duration in minutes (0 = no minimum)
  @Column({ type: 'smallint', default: 0 })
  minimumEntryMinutes!: number;

  // Maximum entry duration in minutes (0 = no maximum)
  @Column({ type: 'int', default: 0 })
  maximumEntryMinutes!: number;

  // Reminder settings
  @Column({ type: 'boolean', default: false })
  enableDailyReminder!: boolean;

  @Column({ type: 'time', nullable: true })
  dailyReminderTime?: string;

  // Lock entries older than X days (0 = disabled)
  @Column({ type: 'smallint', default: 0 })
  lockEntriesAfterDays!: number;

  // Audit
  @Column({ type: 'uuid', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
