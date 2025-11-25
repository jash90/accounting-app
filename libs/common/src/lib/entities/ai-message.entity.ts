import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { AIConversation } from './ai-conversation.entity';
import { User } from './user.entity';

// Enum for message roles
export enum AIMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('ai_messages')
export class AIMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Conversation relationship
  @Column()
  conversationId!: string;

  @ManyToOne(() => AIConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: AIConversation;

  // Message details
  @Column({
    type: 'enum',
    enum: AIMessageRole,
  })
  role!: AIMessageRole;

  @Column({ type: 'text' })
  content!: string;

  // Token tracking
  @Column({ type: 'int', default: 0 })
  inputTokens!: number;

  @Column({ type: 'int', default: 0 })
  outputTokens!: number;

  @Column({ type: 'int', default: 0 })
  totalTokens!: number;

  // User who sent the message (for user messages)
  @Column({ nullable: true })
  userId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  // RAG context used (JSON array of context IDs)
  @Column({ type: 'jsonb', nullable: true })
  contextUsed!: string[] | null;

  // Timestamp
  @CreateDateColumn()
  createdAt!: Date;
}
