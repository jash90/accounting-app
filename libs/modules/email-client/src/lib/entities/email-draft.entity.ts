import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, Company } from '@accounting/common';

/**
 * Email Draft Entity
 *
 * Stores draft emails with AI generation metadata.
 * Used for:
 * - Saving emails before sending
 * - Storing AI-generated reply drafts
 * - Allowing users to edit AI suggestions
 */
@Entity('email_drafts')
export class EmailDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Email fields
  @Column({ nullable: true })
  replyToMessageId?: string; // IMAP message UID if this is a reply

  @Column('simple-array')
  to!: string[];

  @Column('simple-array', { nullable: true })
  cc?: string[];

  @Column('simple-array', { nullable: true })
  bcc?: string[];

  @Column({ nullable: true })
  subject?: string;

  @Column('text')
  textContent!: string;

  @Column('text', { nullable: true })
  htmlContent?: string;

  // Attachments
  @Column({ type: 'jsonb', nullable: true })
  attachmentPaths?: string[]; // Paths to uploaded files in storage

  // AI metadata
  @Column({ default: false })
  isAiGenerated!: boolean;

  @Column('text', { nullable: true })
  aiPrompt?: string; // Original prompt used for generation

  @Column({ type: 'jsonb', nullable: true })
  aiOptions?: {
    tone: 'formal' | 'casual' | 'neutral';
    length: 'short' | 'medium' | 'long';
    customInstructions?: string;
  };

  // IMAP synchronization fields
  @Column({ type: 'bigint', nullable: true })
  imapUid?: number; // IMAP message UID in Drafts folder

  @Column({ nullable: true })
  imapMailbox?: string; // Name of the Drafts mailbox (varies by server)

  @Column({ type: 'timestamp', nullable: true })
  imapSyncedAt?: Date; // Last sync with IMAP server

  @Column({
    type: 'varchar',
    length: 20,
    default: 'local',
  })
  syncStatus!: 'local' | 'synced' | 'imap_only' | 'conflict';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
