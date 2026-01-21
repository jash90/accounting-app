import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { CompanyModuleAccess } from './company-module-access.entity';
import { AIConfiguration } from './ai-configuration.entity';
import { AIConversation } from './ai-conversation.entity';
import { AIContext } from './ai-context.entity';
import { TokenUsage } from './token-usage.entity';
import { TokenLimit } from './token-limit.entity';
import { EmailConfiguration } from './email-configuration.entity';
import { Client } from './client.entity';

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

  @Column({ type: 'boolean', default: false })
  isSystemCompany!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

