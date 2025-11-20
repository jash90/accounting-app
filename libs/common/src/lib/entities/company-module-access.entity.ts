import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Company } from './company.entity';
import { Module } from './module.entity';

@Entity('company_module_access')
@Unique(['companyId', 'moduleId'])
export class CompanyModuleAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  companyId!: string;

  @ManyToOne(() => Company, (company) => company.moduleAccesses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  moduleId!: string;

  @ManyToOne(() => Module, (module) => module.companyAccesses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'moduleId' })
  module!: Module;

  @Column({ default: false })
  isEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

