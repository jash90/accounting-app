import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from './company.entity';
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

  @Column()
  entityType!: string;

  @Column()
  entityId!: string;

  @Column({
    type: 'enum',
    enum: ChangeAction,
  })
  action!: ChangeAction;

  @Column({ type: 'jsonb' })
  changes!: ChangeDetail[];

  @Column()
  changedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changedById' })
  changedBy!: User;

  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @CreateDateColumn()
  createdAt!: Date;
}
