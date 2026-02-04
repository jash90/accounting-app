import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Client } from './client.entity';
import { Company } from './company.entity';
import { User } from './user.entity';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

@Entity('tasks')
@Index(['companyId'])
@Index(['companyId', 'status'])
@Index(['companyId', 'assigneeId'])
@Index(['companyId', 'clientId'])
@Index(['companyId', 'dueDate'])
@Index(['companyId', 'sortOrder'])
@Index(['companyId', 'priority'])
@Index(['companyId', 'parentTaskId'])
@Index(['companyId', 'isActive'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate?: Date;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'int', nullable: true })
  estimatedMinutes?: number;

  @Column({ type: 'smallint', nullable: true })
  storyPoints?: number;

  @Column({ type: 'jsonb', nullable: true })
  acceptanceCriteria?: { id: string; text: string; completed: boolean }[];

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // Multi-tenant
  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  // Optional: Linked client
  @Column({ type: 'uuid', nullable: true })
  clientId?: string;

  @ManyToOne(() => Client, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  // Assignee
  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  // Creator
  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  // Subtasks: self-referencing relation
  @Column({ type: 'uuid', nullable: true })
  parentTaskId?: string;

  @ManyToOne(() => Task, (task) => task.subtasks, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentTaskId' })
  parentTask?: Task;

  @OneToMany(() => Task, (task) => task.parentTask)
  subtasks?: Task[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
