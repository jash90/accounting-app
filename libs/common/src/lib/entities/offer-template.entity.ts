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
import { type ContentBlock } from '../types/content-block.types';

export interface OfferServiceItem {
  name: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  unit?: string;
}

export interface OfferPlaceholder {
  key: string;
  label: string;
  description?: string;
  defaultValue?: string;
}

@Entity('offer_templates')
@Index(['companyId'])
@Index(['isDefault'])
@Index(['companyId', 'isDefault'])
export class OfferTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  templateFilePath?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateFileName?: string;

  @Column({ type: 'jsonb', nullable: true })
  availablePlaceholders?: OfferPlaceholder[];

  @Column({ type: 'jsonb', nullable: true })
  defaultServiceItems?: OfferServiceItem[];

  @Column({ type: 'int', default: 30 })
  defaultValidityDays!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 23.0 })
  defaultVatRate!: number;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  contentBlocks?: ContentBlock[];

  @Column({ type: 'varchar', length: 20, default: 'file' })
  documentSourceType!: 'file' | 'blocks';

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

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
