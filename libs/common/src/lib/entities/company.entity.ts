import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AIConfiguration } from './ai-configuration.entity';
import { AIContext } from './ai-context.entity';
import { AIConversation } from './ai-conversation.entity';
import { Client } from './client.entity';
import { CompanyModuleAccess } from './company-module-access.entity';
import { EmailConfiguration } from './email-configuration.entity';
import { TokenLimit } from './token-limit.entity';
import { TokenUsage } from './token-usage.entity';
import { User } from './user.entity';

@Entity('companies')
@Index(['ownerId']) // For owner's companies queries
@Index(['isSystemCompany']) // For system company lookups
@Index(['isActive']) // For active company queries
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => User, (user) => user.company)
  employees!: User[];

  @OneToMany(() => CompanyModuleAccess, (access) => access.company)
  moduleAccesses!: CompanyModuleAccess[];

  @OneToMany(() => AIConfiguration, (config) => config.company)
  aiConfigurations!: AIConfiguration[];

  @OneToMany(() => AIConversation, (conversation) => conversation.company)
  aiConversations!: AIConversation[];

  @OneToMany(() => AIContext, (context) => context.company)
  aiContexts!: AIContext[];

  @OneToMany(() => TokenUsage, (usage) => usage.company)
  tokenUsages!: TokenUsage[];

  @OneToMany(() => TokenLimit, (limit) => limit.company)
  tokenLimits!: TokenLimit[];

  @OneToOne(() => EmailConfiguration, (config) => config.company, { nullable: true })
  emailConfig?: EmailConfiguration | null;

  @OneToMany(() => Client, (client) => client.company)
  clients!: Client[];

  @Column({ type: 'varchar', length: 10, nullable: true })
  nip?: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  regon?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Polska' })
  country?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccount?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerName?: string | null;

  @Column({ type: 'varchar', length: 17, nullable: true })
  krs?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  buildingNumber?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  apartmentNumber?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ownerFirstName?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ownerLastName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerEmail?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ownerPhone?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({ type: 'text', nullable: true })
  defaultEmailSignature?: string | null;

  @Column({ type: 'text', nullable: true })
  defaultDocumentFooter?: string | null;

  @Column({ type: 'boolean', default: false })
  isSystemCompany!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
