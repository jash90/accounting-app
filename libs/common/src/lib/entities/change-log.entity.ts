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
import { ChangeAction } from '../enums/change-action.enum';

export interface ChangeDetail {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

@Entity('change_logs')
@Index(['entityType', 'entityId'])
@Index(['changedById'])
@Index(['companyId'])
@Index(['companyId', 'entityType', 'entityId'])
export class ChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({
    type: 'enum',
    enum: ChangeAction,
  })
  action!: ChangeAction;

  @Column({ type: 'jsonb' })
  changes!: ChangeDetail[];

  @Column({ type: 'uuid' })
  changedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changedById' })
  changedBy!: User;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @CreateDateColumn()
  createdAt!: Date;
}
