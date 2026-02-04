import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ClientIconAssignment } from './client-icon-assignment.entity';
import { Company } from './company.entity';
import { User } from './user.entity';
import { IconType } from '../enums/icon-type.enum';
import { AutoAssignCondition } from '../types/auto-assign-condition.types';

@Entity('client_icons')
@Index(['companyId'])
export class ClientIcon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  // Icon type: 'lucide' | 'custom' | 'emoji'
  @Column({
    type: 'varchar',
    length: 20,
    default: IconType.CUSTOM,
  })
  iconType!: IconType;

  // Lucide icon name or emoji character (for lucide/emoji types)
  @Column({ type: 'varchar', nullable: true })
  iconValue?: string;

  // File-related columns (only required for 'custom' type)
  @Column({ type: 'varchar', nullable: true })
  fileName?: string;

  @Column({ type: 'varchar', nullable: true })
  filePath?: string;

  @Column({ type: 'varchar', nullable: true })
  mimeType?: string;

  @Column({ type: 'integer', nullable: true })
  fileSize?: number;

  @Column({ type: 'varchar', nullable: true })
  color?: string;

  // Tooltip text for hover
  @Column({ type: 'varchar', nullable: true })
  tooltip?: string;

  // Auto-assign condition (JSON) for automatic icon assignment
  @Column({ type: 'jsonb', nullable: true })
  autoAssignCondition?: AutoAssignCondition;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @OneToMany(() => ClientIconAssignment, (cia) => cia.icon)
  assignments?: ClientIconAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Validate state consistency based on iconType before insert/update
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateIconTypeFields(): void {
    if (this.iconType === IconType.CUSTOM) {
      // Custom icons require file-related fields
      if (!this.fileName || !this.filePath || !this.mimeType) {
        throw new Error('Custom icons require fileName, filePath, and mimeType to be set');
      }
    } else if (this.iconType === IconType.LUCIDE || this.iconType === IconType.EMOJI) {
      // Lucide and emoji icons require iconValue
      if (!this.iconValue) {
        throw new Error(`${this.iconType} icons require iconValue to be set`);
      }
    }
  }
}
