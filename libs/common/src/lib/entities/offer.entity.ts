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
import { Lead } from './lead.entity';
import { OfferServiceItem, OfferTemplate } from './offer-template.entity';
import { User } from './user.entity';
import { OfferStatus } from '../enums/offer-status.enum';

export interface RecipientSnapshot {
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactPosition?: string;
  email?: string;
  phone?: string;
}

/** Extended service item for offers (includes netAmount) */
export interface OfferServiceItemWithAmount extends OfferServiceItem {
  netAmount: number;
}

export interface ServiceTerms {
  items: OfferServiceItemWithAmount[];
  paymentTermDays?: number;
  paymentMethod?: string;
  additionalTerms?: string;
}

@Entity('offers')
@Unique(['companyId', 'offerNumber'])
@Index(['companyId'])
@Index(['status'])
@Index(['offerNumber'])
@Index(['companyId', 'status'])
@Index(['clientId'])
@Index(['leadId'])
@Index(['offerDate'])
@Index(['validUntil'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  offerNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.DRAFT,
  })
  status!: OfferStatus;

  @Column({ type: 'uuid', nullable: true })
  clientId?: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  @Column({ type: 'uuid', nullable: true })
  leadId?: string;

  @ManyToOne(() => Lead, { nullable: true })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column({ type: 'jsonb' })
  recipientSnapshot!: RecipientSnapshot;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @ManyToOne(() => OfferTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: OfferTemplate;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalNetAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 23.0 })
  vatRate!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalGrossAmount!: number;

  @Column({ type: 'jsonb', nullable: true })
  serviceTerms?: ServiceTerms;

  @Column({ type: 'jsonb', nullable: true })
  customPlaceholders?: Record<string, string>;

  @Column({ type: 'date' })
  offerDate!: Date;

  @Column({ type: 'date' })
  validUntil!: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  generatedDocumentPath?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  generatedDocumentName?: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sentToEmail?: string;

  @Column({ type: 'uuid', nullable: true })
  sentById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sentById' })
  sentBy?: User;

  @Column({ type: 'text', nullable: true })
  emailSubject?: string;

  @Column({ type: 'text', nullable: true })
  emailBody?: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

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
