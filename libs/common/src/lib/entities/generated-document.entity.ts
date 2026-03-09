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
import { DocumentTemplate } from './document-template.entity';
import { User } from './user.entity';

@Entity('generated_documents')
@Index(['companyId'])
@Index(['companyId', 'templateId'])
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string | null;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string | null;

  @ManyToOne(() => DocumentTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template?: DocumentTemplate | null;

  @Column({ type: 'uuid' })
  generatedById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'generatedById' })
  generatedBy!: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceModule?: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceEntityId?: string | null;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
