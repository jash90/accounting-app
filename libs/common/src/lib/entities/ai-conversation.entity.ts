import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';
import { AIMessage } from './ai-message.entity';

@Entity('ai_conversations')
export class AIConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'New Conversation' })
  title!: string;

  // System Admin Company pattern - nullable for ADMIN entries
  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.aiConversations, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // Creator
  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  // Messages relationship
  @OneToMany(() => AIMessage, (message) => message.conversation, {
    cascade: true,
  })
  messages!: AIMessage[];

  // Metadata
  @Column({ type: 'int', default: 0 })
  totalTokens!: number;

  @Column({ type: 'int', default: 0 })
  messageCount!: number;

  @Column({ default: false })
  isArchived!: boolean;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
