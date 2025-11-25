import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('token_usages')
@Index(['companyId', 'userId', 'date'], { unique: true })
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.tokenUsages, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // User tracking
  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Date for aggregation (daily)
  @Column({ type: 'date' })
  date!: Date;

  // Token statistics
  @Column({ type: 'int', default: 0 })
  totalInputTokens!: number;

  @Column({ type: 'int', default: 0 })
  totalOutputTokens!: number;

  @Column({ type: 'int', default: 0 })
  totalTokens!: number;

  // Message statistics
  @Column({ type: 'int', default: 0 })
  conversationCount!: number;

  @Column({ type: 'int', default: 0 })
  messageCount!: number;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
