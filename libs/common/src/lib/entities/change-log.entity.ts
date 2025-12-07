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
import { ChangeAction } from '../enums/change-action.enum';

export interface ChangeDetail {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

@Entity('change_logs')
@Index(['entityType', 'entityId'])
@Index(['changedById'])
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

  @CreateDateColumn()
  createdAt!: Date;
}
