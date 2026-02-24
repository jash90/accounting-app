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

export type DocumentCategory = 'offer' | 'contract' | 'invoice' | 'report' | 'other';

@Entity('document_templates')
@Index(['companyId'])
@Index(['companyId', 'category'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  templateContent?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  templateFilePath?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  templateFileName?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  placeholders?: string[] | null;

  @Column({ type: 'varchar', length: 50, default: 'other' })
  category!: DocumentCategory;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
