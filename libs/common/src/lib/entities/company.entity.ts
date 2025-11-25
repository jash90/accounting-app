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
import { User } from './user.entity';
import { CompanyModuleAccess } from './company-module-access.entity';
import { SimpleText } from './simple-text.entity';
import { AIConfiguration } from './ai-configuration.entity';
import { AIConversation } from './ai-conversation.entity';
import { AIContext } from './ai-context.entity';
import { TokenUsage } from './token-usage.entity';
import { TokenLimit } from './token-limit.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  ownerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => User, (user) => user.company)
  employees!: User[];

  @OneToMany(() => CompanyModuleAccess, (access) => access.company)
  moduleAccesses!: CompanyModuleAccess[];

  @OneToMany(() => SimpleText, (text) => text.company)
  simpleTexts!: SimpleText[];

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

  @Column({ default: false })
  isSystemCompany!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

