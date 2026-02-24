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

@Entity('email_auto_reply_templates')
@Index(['companyId'])
@Index(['companyId', 'isActive'])
export class EmailAutoReplyTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Trigger configuration
  @Column({ type: 'simple-array' })
  triggerKeywords!: string[];

  @Column({ type: 'varchar', length: 10, default: 'any' })
  keywordMatchMode!: 'any' | 'all';

  @Column({ type: 'boolean', default: false })
  matchSubjectOnly!: boolean;

  // Template configuration
  @Column({ type: 'text' })
  bodyTemplate!: string;

  @Column({ type: 'varchar', length: 20, default: 'neutral' })
  tone!: 'formal' | 'casual' | 'neutral';

  @Column({ type: 'text', nullable: true })
  customInstructions?: string | null;

  // Attachments
  @Column({ type: 'jsonb', nullable: true })
  attachmentPaths?: string[] | null;

  // Meta stats
  @Column({ type: 'uuid', nullable: true })
  createdById?: string | null;

  @Column({ type: 'int', default: 0 })
  matchCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastMatchedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
