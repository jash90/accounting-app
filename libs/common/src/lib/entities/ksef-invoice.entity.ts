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

import { Client } from './client.entity';
import { Company } from './company.entity';
import { KsefSession } from './ksef-session.entity';
import { User } from './user.entity';
import { KsefInvoiceDirection } from '../enums/ksef-invoice-direction.enum';
import { KsefInvoiceStatus } from '../enums/ksef-invoice-status.enum';
import { KsefInvoiceType } from '../enums/ksef-invoice-type.enum';

@Entity('ksef_invoices')
@Index(['companyId', 'status'])
@Unique(['companyId', 'invoiceNumber'])
@Index(['ksefNumber'], { unique: true, where: '"ksefNumber" IS NOT NULL' })
@Index(['companyId', 'issueDate'])
@Index(['clientId'])
@Index(['sessionId'])
export class KsefInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid', nullable: true })
  clientId?: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client?: Client | null;

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string | null;

  @ManyToOne(() => KsefSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sessionId' })
  session?: KsefSession | null;

  @Column({
    type: 'enum',
    enum: KsefInvoiceType,
  })
  invoiceType!: KsefInvoiceType;

  @Column({
    type: 'enum',
    enum: KsefInvoiceDirection,
  })
  direction!: KsefInvoiceDirection;

  @Column({ type: 'varchar' })
  invoiceNumber!: string;

  @Column({ type: 'varchar', nullable: true })
  ksefNumber?: string | null;

  @Column({ type: 'varchar', nullable: true })
  ksefReferenceNumber?: string | null;

  @Column({
    type: 'enum',
    enum: KsefInvoiceStatus,
    default: KsefInvoiceStatus.DRAFT,
  })
  status!: KsefInvoiceStatus;

  @Column({ type: 'date' })
  issueDate!: Date;

  @Column({ type: 'date', nullable: true })
  dueDate?: Date | null;

  @Column({ type: 'varchar', length: 10 })
  sellerNip!: string;

  @Column({ type: 'varchar' })
  sellerName!: string;

  @Column({ type: 'varchar', nullable: true })
  buyerNip?: string | null;

  @Column({ type: 'varchar' })
  buyerName!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  netAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  vatAmount!: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  grossAmount!: number;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency!: string;

  @Column({ type: 'jsonb', nullable: true })
  lineItems?: Record<string, unknown>[] | null;

  @Column({ type: 'text', nullable: true })
  xmlContent?: string | null;

  @Column({ type: 'varchar', nullable: true })
  xmlHash?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rawKsefResponse?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: Record<string, unknown>[] | null;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  correctedInvoiceId?: string | null;

  @ManyToOne(() => KsefInvoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'correctedInvoiceId' })
  correctedInvoice?: KsefInvoice | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
