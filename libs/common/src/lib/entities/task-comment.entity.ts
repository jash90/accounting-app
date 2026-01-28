import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_comments')
@Index(['taskId'])
@Index(['taskId', 'createdAt'])
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'boolean', default: false })
  isEdited!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
