import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Client } from './client.entity';
import { Company } from './company.entity';
import { User } from './user.entity';
import { EmployeeContractType, WorkplaceType } from '../enums/employee-contract-type.enum';

/**
 * Client Employee entity - represents employees working for a client company.
 * Supports three contract types with specific fields for each.
 */
@Entity('client_employees')
@Index(['companyId'])
@Index(['companyId', 'clientId'])
@Index(['companyId', 'isActive'])
@Index(['clientId', 'isActive'])
export class ClientEmployee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ============================================
  // Multi-tenancy
  // ============================================

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  // ============================================
  // Personal Data
  // ============================================

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  pesel?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  // ============================================
  // Employment Data (Common)
  // ============================================

  @Column({
    type: 'enum',
    enum: EmployeeContractType,
  })
  contractType!: EmployeeContractType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position?: string;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  /** Gross salary in grosze (PLN * 100) */
  @Column({ type: 'integer', nullable: true })
  grossSalary?: number;

  // ============================================
  // UMOWA_O_PRACE specific fields
  // ============================================

  /** Working hours per week (e.g., 40 for full-time) */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  workingHoursPerWeek?: number;

  /** Vacation days per year */
  @Column({ type: 'integer', nullable: true })
  vacationDaysPerYear?: number;

  @Column({
    type: 'enum',
    enum: WorkplaceType,
    nullable: true,
  })
  workplaceType?: WorkplaceType;

  // ============================================
  // UMOWA_ZLECENIE specific fields
  // ============================================

  /** Hourly rate in grosze (PLN * 100) */
  @Column({ type: 'integer', nullable: true })
  hourlyRate?: number;

  /** Is the employee a student (under 26) - affects ZUS contributions */
  @Column({ type: 'boolean', nullable: true })
  isStudent?: boolean;

  /** Has other insurance (e.g., from another job) */
  @Column({ type: 'boolean', nullable: true })
  hasOtherInsurance?: boolean;

  // ============================================
  // UMOWA_O_DZIELO specific fields
  // ============================================

  @Column({ type: 'text', nullable: true })
  projectDescription?: string;

  @Column({ type: 'date', nullable: true })
  deliveryDate?: Date;

  /** Agreed amount in grosze (PLN * 100) */
  @Column({ type: 'integer', nullable: true })
  agreedAmount?: number;

  // ============================================
  // Status and Notes
  // ============================================

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // ============================================
  // Audit fields
  // ============================================

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
