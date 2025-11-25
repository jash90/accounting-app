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

// Enum for AI providers
export enum AIProvider {
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
}

@Entity('ai_configurations')
export class AIConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.aiConfigurations, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // AI Provider configuration
  @Column({
    type: 'enum',
    enum: AIProvider,
    default: AIProvider.OPENAI,
  })
  provider!: AIProvider;

  @Column({ default: 'gpt-4' })
  model!: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt!: string | null;

  // Encrypted API key
  @Column({ type: 'text' })
  apiKey!: string;

  // Model parameters
  @Column({ type: 'float', default: 0.7 })
  temperature!: number;

  @Column({ type: 'int', default: 4000 })
  maxTokens!: number;

  // Audit trail
  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: true })
  updatedById!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy!: User | null;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
