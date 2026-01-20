import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';
import { Client } from './client.entity';
import { Task } from './task.entity';
import { TimeEntryStatus } from '../enums/time-entry-status.enum';

@Entity('time_entries')
@Index(['companyId'])
@Index(['companyId', 'userId'])
@Index(['companyId', 'status'])
@Index(['companyId', 'startTime'])
@Index(['companyId', 'clientId'])
@Index(['companyId', 'taskId'])
@Index(['companyId', 'isBillable'])
@Index(['companyId', 'userId', 'startTime'])
@Index(['userId', 'startTime', 'endTime']) // For overlap detection
@Index(['userId', 'companyId', 'isRunning', 'isActive']) // For timer lookups
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ type: 'timestamptz' })
  startTime!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime?: Date;

  // Duration in minutes (calculated or entered manually)
  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  // Is this entry currently running (timer active)?
  @Column({ default: false })
  isRunning!: boolean;

  // Billing
  @Column({ default: true })
  isBillable!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount?: number;

  // Currency code (ISO 4217)
  @Column({ length: 3, default: 'PLN' })
  currency!: string;

  // Status workflow
  @Column({
    type: 'enum',
    enum: TimeEntryStatus,
    default: TimeEntryStatus.DRAFT,
  })
  status!: TimeEntryStatus;

  // Notes for rejection
  @Column({ type: 'text', nullable: true })
  rejectionNote?: string;

  // Tags for categorization
  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  // Multi-tenant
  @Column()
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  // Owner of the time entry
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Optional: Linked client
  @Column({ nullable: true })
  clientId?: string;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  // Optional: Linked task
  @Column({ nullable: true })
  taskId?: string;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'taskId' })
  task?: Task;

  // Approval workflow
  @Column({ nullable: true })
  approvedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy?: User;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  billedAt?: Date;

  // Creator (may differ from userId for manager entries)
  @Column()
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ default: true })
  isActive!: boolean;

  // Entry locking for approved/billed entries
  @Column({ default: false })
  isLocked!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lockedAt?: Date;

  @Column({ nullable: true })
  lockedById?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lockedById' })
  lockedBy?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
