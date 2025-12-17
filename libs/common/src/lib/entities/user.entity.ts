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
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { Company } from './company.entity';
import { UserModulePermission } from './user-module-permission.entity';
import { EmailConfiguration } from './email-configuration.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.employees, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @Column({ type: 'uuid', nullable: true })
  activeCompanyId!: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'activeCompanyId' })
  activeCompany?: Company | null;

  @Column({ default: true })
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

