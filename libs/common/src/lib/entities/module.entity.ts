import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyModuleAccess } from './company-module-access.entity';
import { UserModulePermission } from './user-module-permission.entity';

export enum ModuleSource {
  FILE = 'file',
  DATABASE = 'database',
  LEGACY = 'legacy',
}

@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({
    type: 'enum',
    enum: ModuleSource,
    default: ModuleSource.LEGACY,
  })
  source!: ModuleSource;

  @Column({ nullable: true })
  version!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  permissions!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  defaultPermissions!: string[] | null;

  @Column({ nullable: true })
  configPath!: string | null;

  @Column({ nullable: true })
  icon!: string | null;

  @Column({ nullable: true })
  category!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  dependencies!: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, unknown> | null;

  @OneToMany(() => CompanyModuleAccess, (access) => access.module)
  companyAccesses!: CompanyModuleAccess[];

  @OneToMany(() => UserModulePermission, (permission) => permission.module)
  userPermissions!: UserModulePermission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

