import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { CompanyModuleAccess } from './company-module-access.entity';
import { UserModulePermission } from './user-module-permission.entity';

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

  @OneToMany(() => CompanyModuleAccess, (access) => access.module)
  companyAccesses!: CompanyModuleAccess[];

  @OneToMany(() => UserModulePermission, (permission) => permission.module)
  userPermissions!: UserModulePermission[];

  @CreateDateColumn()
  createdAt!: Date;
}

