import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Module } from './module.entity';
import { User } from './user.entity';

@Entity('user_module_permissions')
@Unique(['userId', 'moduleId'])
export class UserModulePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, (user) => user.modulePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  moduleId!: string;

  @ManyToOne(() => Module, (module) => module.userPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'moduleId' })
  module!: Module;

  @Column('simple-array')
  permissions!: string[];

  @Column('uuid')
  grantedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'grantedById' })
  grantedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
