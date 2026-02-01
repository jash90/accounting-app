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
import { HealthContributionType } from '../enums/health-contribution-type.enum';
import { ZusDiscountType } from '../enums/zus-discount-type.enum';

/**
 * ZUS Client Settings - ZUS configuration for a specific client
 * Ustawienia ZUS dla konkretnego klienta
 */
@Entity('zus_client_settings')
@Index(['companyId'])
@Index(['clientId'], { unique: true })
@Index(['companyId', 'isActive'])
export class ZusClientSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid', unique: true })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  // ============================================
  // Discount/Relief settings
  // Ustawienia ulg
  // ============================================

  /** Current ZUS discount type */
  @Column({
    type: 'enum',
    enum: ZusDiscountType,
    default: ZusDiscountType.NONE,
  })
  discountType!: ZusDiscountType;

  /** When the discount period started */
  @Column({ type: 'date', nullable: true })
  discountStartDate?: Date;

  /** When the discount period ends (calculated or manual) */
  @Column({ type: 'date', nullable: true })
  discountEndDate?: Date;

  // ============================================
  // Health contribution settings
  // Ustawienia składki zdrowotnej
  // ============================================

  /** Health contribution calculation method (based on taxation form) */
  @Column({
    type: 'enum',
    enum: HealthContributionType,
    default: HealthContributionType.SCALE,
  })
  healthContributionType!: HealthContributionType;

  // ============================================
  // Insurance options
  // Opcje ubezpieczenia
  // ============================================

  /** Whether voluntary sickness insurance is opted in */
  @Column({ type: 'boolean', default: false })
  sicknessInsuranceOptIn!: boolean;

  // ============================================
  // Payment settings
  // Ustawienia płatności
  // ============================================

  /** Day of month for ZUS payment (10, 15, or 20) */
  @Column({ type: 'int', default: 15 })
  paymentDay!: number;

  /** Custom accident insurance rate (default 1.67% for firms <10 employees) */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.0167 })
  accidentRate!: number;

  // ============================================
  // Status
  // ============================================

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

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
