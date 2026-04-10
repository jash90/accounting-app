import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { User } from './user.entity';
import { KsefAuthMethod } from '../enums/ksef-auth-method.enum';
import { KsefEnvironment } from '../enums/ksef-environment.enum';

@Entity('ksef_configurations')
@Unique(['companyId'])
export class KsefConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({
    type: 'enum',
    enum: KsefEnvironment,
    default: KsefEnvironment.TEST,
  })
  environment!: KsefEnvironment;

  @Column({
    type: 'enum',
    enum: KsefAuthMethod,
    default: KsefAuthMethod.TOKEN,
  })
  authMethod!: KsefAuthMethod;

  @Column({ type: 'text', nullable: true })
  encryptedToken?: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedCertificate?: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedCertificatePassword?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  nip?: string | null;

  @Column({ type: 'boolean', default: false })
  autoSendEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastConnectionTestAt?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastConnectionTestResult?: string | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
