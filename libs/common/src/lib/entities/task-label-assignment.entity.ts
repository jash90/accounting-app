import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Task } from './task.entity';
import { TaskLabel } from './task-label.entity';
import { User } from './user.entity';

@Entity('task_label_assignments')
@Index(['taskId'])
@Index(['labelId'])
@Unique(['taskId', 'labelId'])
export class TaskLabelAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @Column()
  labelId!: string;

  @ManyToOne(() => TaskLabel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labelId' })
  label!: TaskLabel;

  @Column()
  assignedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedById' })
  assignedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
