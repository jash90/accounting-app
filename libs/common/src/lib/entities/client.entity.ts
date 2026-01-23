import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ClientCustomFieldValue } from './client-custom-field-value.entity';
import { ClientIconAssignment } from './client-icon-assignment.entity';
import { ClientSuspension } from './client-suspension.entity';
import { Company } from './company.entity';
import { User } from './user.entity';
import { AmlGroup } from '../enums/aml-group.enum';
import { EmploymentType } from '../enums/employment-type.enum';
import { TaxScheme } from '../enums/tax-scheme.enum';
import { VatStatus } from '../enums/vat-status.enum';
import { ZusStatus } from '../enums/zus-status.enum';

@Entity('clients')
@Index(['companyId'])
@Index(['nip'])
@Index(['name'])
@Index(['companyId', 'isActive']) // For filtering active clients per company
@Index(['companyId', 'name']) // For search and ordering within company
@Index(['employmentType']) // For employment type filtering
@Index(['vatStatus']) // For VAT status filtering
@Index(['taxScheme']) // For tax scheme filtering
@Index(['zusStatus']) // For ZUS status filtering
@Index(['email']) // For email search queries
@Index(['pkdCode']) // For PKD code filtering
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  nip?: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @Column({ type: 'date', nullable: true })
  companyStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  cooperationStartDate?: Date;

  /**
   * @deprecated Use the suspensions relation (ClientSuspension[]) for suspension history.
   * This field is kept for backward compatibility during migration.
   */
  @Column({ type: 'date', nullable: true })
  suspensionDate?: Date;

  @Column({ type: 'text', nullable: true })
  companySpecificity?: string;

  @Column({ type: 'text', nullable: true })
  additionalInfo?: string;

  // Legacy single GTU code (kept for backward compatibility)
  @Column({ type: 'varchar', nullable: true })
  gtuCode?: string;

  // Multiple GTU codes array
  @Column({ type: 'text', array: true, nullable: true })
  gtuCodes?: string[];

  // Main PKD code (Polska Klasyfikacja Działalności)
  @Column({ type: 'varchar', nullable: true, length: 10 })
  pkdCode?: string;

  // Legacy amlGroup string (kept for backward compatibility)
  @Column({ type: 'varchar', nullable: true })
  amlGroup?: string;

  // New amlGroup enum
  @Column({
    type: 'enum',
    enum: AmlGroup,
    nullable: true,
    name: 'amlGroupEnum',
  })
  amlGroupEnum?: AmlGroup;

  // Flag for client receiving email copies
  @Column({ type: 'boolean', default: false })
  receiveEmailCopy!: boolean;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    nullable: true,
  })
  employmentType?: EmploymentType;

  @Column({
    type: 'enum',
    enum: VatStatus,
    nullable: true,
  })
  vatStatus?: VatStatus;

  @Column({
    type: 'enum',
    enum: TaxScheme,
    nullable: true,
  })
  taxScheme?: TaxScheme;

  @Column({
    type: 'enum',
    enum: ZusStatus,
    nullable: true,
  })
  zusStatus?: ZusStatus;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, (company) => company.clients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'uuid', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @OneToMany(() => ClientCustomFieldValue, (cfv) => cfv.client)
  customFieldValues?: ClientCustomFieldValue[];

  @OneToMany(() => ClientIconAssignment, (cia) => cia.client)
  iconAssignments?: ClientIconAssignment[];

  @OneToMany(() => ClientSuspension, (suspension) => suspension.client)
  suspensions?: ClientSuspension[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
