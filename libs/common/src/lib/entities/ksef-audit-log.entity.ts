import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('ksef_audit_logs')
@Index(['companyId', 'createdAt'])
export class KsefAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar', nullable: true })
  entityType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  httpMethod?: string | null;

  @Column({ type: 'varchar', nullable: true })
  httpUrl?: string | null;

  @Column({ type: 'int', nullable: true })
  httpStatusCode?: number | null;

  @Column({ type: 'text', nullable: true })
  responseSnippet?: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'int', nullable: true })
  durationMs?: number | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
