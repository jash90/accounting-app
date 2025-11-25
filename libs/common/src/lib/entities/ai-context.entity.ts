import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('ai_contexts')
export class AIContext {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.aiContexts, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // File metadata
  @Column()
  filename!: string;

  @Column()
  mimeType!: string;

  @Column()
  filePath!: string;

  @Column({ type: 'int' })
  fileSize!: number;

  // Extracted content
  @Column({ type: 'text' })
  extractedText!: string;

  // Vector embedding for RAG (1536 dimensions for OpenAI ada-002)
  @Column({
    type: 'vector',
    length: 1536,
    nullable: true,
  })
  embedding!: number[] | null;

  // Status
  @Column({ default: true })
  isActive!: boolean;

  // Upload metadata
  @Column()
  uploadedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy!: User;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
