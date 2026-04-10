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
import { KsefSessionStatus } from '../enums/ksef-session-status.enum';
import { KsefSessionType } from '../enums/ksef-session-type.enum';

@Entity('ksef_sessions')
@Index(['companyId', 'status'])
export class KsefSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({
    type: 'enum',
    enum: KsefSessionType,
  })
  sessionType!: KsefSessionType;

  @Column({ type: 'varchar', nullable: true })
  ksefSessionRef?: string | null;

  @Column({
    type: 'enum',
    enum: KsefSessionStatus,
    default: KsefSessionStatus.OPENING,
  })
  status!: KsefSessionStatus;

  @Column({ type: 'timestamp' })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  invoiceCount!: number;

  @Column({ type: 'varchar', nullable: true })
  upoReference?: string | null;

  @Column({ type: 'text', nullable: true })
  upoContent?: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

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
