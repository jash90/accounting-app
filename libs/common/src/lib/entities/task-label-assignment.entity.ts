import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { TaskLabel } from './task-label.entity';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_label_assignments')
@Index(['taskId'])
@Index(['labelId'])
@Unique(['taskId', 'labelId'])
export class TaskLabelAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @Column({ type: 'uuid' })
  labelId!: string;

  @ManyToOne(() => TaskLabel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labelId' })
  label!: TaskLabel;

  @Column({ type: 'uuid' })
  assignedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedById' })
  assignedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
