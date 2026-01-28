import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { Company } from './company.entity';
import { UserModulePermission } from './user-module-permission.entity';
import { EmailConfiguration } from './email-configuration.entity';

@Entity('users')
@Index(['companyId']) // For company employee queries
@Index(['companyId', 'isActive']) // For active employee queries
@Index(['role']) // For role-based queries
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.employees, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => UserModulePermission, (permission) => permission.user)
  modulePermissions!: UserModulePermission[];

  @OneToOne(() => EmailConfiguration, (config) => config.user, { nullable: true })
  emailConfig?: EmailConfiguration | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
