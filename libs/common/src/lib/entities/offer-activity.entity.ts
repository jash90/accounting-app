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
import { Offer } from './offer.entity';
import { User } from './user.entity';
import { OfferActivityType } from '../enums/offer-activity-type.enum';
import { OfferStatus } from '../enums/offer-status.enum';

export interface ActivityMetadata {
  previousStatus?: OfferStatus;
  newStatus?: OfferStatus;
  documentPath?: string;
  emailRecipient?: string;
  emailSubject?: string;
  comment?: string;
  duplicatedFromOfferId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

@Entity('offer_activities')
@Index(['offerId'])
@Index(['companyId'])
@Index(['activityType'])
@Index(['createdAt'])
export class OfferActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  offerId!: string;

  @ManyToOne(() => Offer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offerId' })
  offer!: Offer;

  @Column({
    type: 'enum',
    enum: OfferActivityType,
  })
  activityType!: OfferActivityType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ActivityMetadata;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  performedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedById' })
  performedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
