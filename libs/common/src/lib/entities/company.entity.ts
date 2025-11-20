import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CompanyModuleAccess } from './company-module-access.entity';
import { SimpleText } from './simple-text.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  ownerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => User, (user) => user.company)
  employees!: User[];

  @OneToMany(() => CompanyModuleAccess, (access) => access.company)
  moduleAccesses!: CompanyModuleAccess[];

  @OneToMany(() => SimpleText, (text) => text.company)
  simpleTexts!: SimpleText[];

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

