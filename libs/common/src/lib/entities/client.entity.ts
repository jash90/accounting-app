import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Company } from './company.entity';
import { EmploymentType } from '../enums/employment-type.enum';
import { VatStatus } from '../enums/vat-status.enum';
import { TaxScheme } from '../enums/tax-scheme.enum';
import { ZusStatus } from '../enums/zus-status.enum';
import { AmlGroup } from '../enums/aml-group.enum';
import { ClientCustomFieldValue } from './client-custom-field-value.entity';
import { ClientIconAssignment } from './client-icon-assignment.entity';

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
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  nip?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'date', nullable: true })
  companyStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  cooperationStartDate?: Date;

  @Column({ type: 'date', nullable: true })
  suspensionDate?: Date;

  @Column({ type: 'text', nullable: true })
  companySpecificity?: string;

  @Column({ type: 'text', nullable: true })
  additionalInfo?: string;

  // Legacy single GTU code (kept for backward compatibility)
  @Column({ nullable: true })
  gtuCode?: string;

  // Multiple GTU codes array
  @Column({ type: 'text', array: true, nullable: true })
  gtuCodes?: string[];

  // Main PKD code (Polska Klasyfikacja Działalności)
  @Column({ nullable: true, length: 10 })
  pkdCode?: string;

  // Legacy amlGroup string (kept for backward compatibility)
  @Column({ nullable: true })
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
  @Column({ default: false })
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

  @Column()
  companyId!: string;

  @ManyToOne(() => Company, (company) => company.clients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ default: true })
  isActive!: boolean;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: true })
  updatedById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @OneToMany(() => ClientCustomFieldValue, (cfv) => cfv.client)
  customFieldValues?: ClientCustomFieldValue[];

  @OneToMany(() => ClientIconAssignment, (cia) => cia.client)
  iconAssignments?: ClientIconAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
