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

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    type: 'enum',
    enum: ModuleSource,
    default: ModuleSource.LEGACY,
  })
  source!: ModuleSource;

  @Column({ type: 'varchar', nullable: true })
  version!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  permissions!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  defaultPermissions!: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  configPath!: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon!: string | null;

  @Column({ type: 'varchar', nullable: true })
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
