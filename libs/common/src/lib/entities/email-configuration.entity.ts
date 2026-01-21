import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';
import { Company } from './company.entity';

/**
 * Email Configuration Entity
 * Stores encrypted SMTP and IMAP configuration for users or companies
 *
 * Each configuration belongs to either:
 * - One user (userId is set, companyId is null)
 * - One company (companyId is set, userId is null)
 *
 * Passwords are stored encrypted using EncryptionService
 */
@Entity('email_configurations')
@Check(
  `("userId" IS NOT NULL AND "companyId" IS NULL) OR ("userId" IS NULL AND "companyId" IS NOT NULL)`
)
export class EmailConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Relation to User (nullable)
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @OneToOne(() => User, (user) => user.emailConfig, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  // Relation to Company (nullable)
  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @OneToOne(() => Company, (company) => company.emailConfig, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  // SMTP Configuration
  @Column({ type: 'varchar' })
  smtpHost!: string;

  @Column({ type: 'int' })
  smtpPort!: number;

  @Column({ type: 'boolean', default: true })
  smtpSecure!: boolean;

  @Column({ type: 'varchar' })
  smtpUser!: string;

  /**
   * Encrypted SMTP password
   * Use EncryptionService to encrypt before saving and decrypt after reading
   */
  @Column({ type: 'varchar' })
  @Exclude()
  smtpPassword!: string;

  // IMAP Configuration
  @Column({ type: 'varchar' })
  imapHost!: string;

  @Column({ type: 'int' })
  imapPort!: number;

  @Column({ type: 'boolean', default: true })
  imapTls!: boolean;

  @Column({ type: 'varchar' })
  imapUser!: string;

  /**
   * Encrypted IMAP password
   * Use EncryptionService to encrypt before saving and decrypt after reading
   */
  @Column({ type: 'varchar' })
  @Exclude()
  imapPassword!: string;

  // Optional metadata
  @Column({ type: 'varchar', nullable: true })
  displayName?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
