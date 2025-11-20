import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Module } from './module.entity';

@Entity('user_module_permissions')
@Unique(['userId', 'moduleId'])
export class UserModulePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.modulePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  moduleId!: string;

  @ManyToOne(() => Module, (module) => module.userPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'moduleId' })
  module!: Module;

  @Column('simple-array')
  permissions!: string[];

  @Column()
  grantedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'grantedById' })
  grantedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}

