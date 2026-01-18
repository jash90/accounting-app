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
import { User } from './user.entity';
import { TaskDependencyType } from '../enums/task-dependency-type.enum';

@Entity('task_dependencies')
@Index(['taskId'])
@Index(['dependsOnTaskId'])
@Unique(['taskId', 'dependsOnTaskId'])
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @Column()
  dependsOnTaskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependsOnTaskId' })
  dependsOnTask!: Task;

  @Column({
    type: 'enum',
    enum: TaskDependencyType,
    default: TaskDependencyType.BLOCKED_BY,
  })
  dependencyType!: TaskDependencyType;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
