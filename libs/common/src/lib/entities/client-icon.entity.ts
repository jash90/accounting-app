import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';
import { ClientIconAssignment } from './client-icon-assignment.entity';
import { IconType } from '../enums/icon-type.enum';
import { AutoAssignCondition } from '../types/auto-assign-condition.types';

@Entity('client_icons')
@Index(['companyId'])
export class ClientIcon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // Icon type: 'lucide' | 'custom' | 'emoji'
  @Column({
    type: 'varchar',
    length: 20,
    default: IconType.CUSTOM,
  })
  iconType!: IconType;

  // Lucide icon name or emoji character (for lucide/emoji types)
  @Column({ nullable: true })
  iconValue?: string;

  // File-related columns (only required for 'custom' type)
  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  color?: string;

  // Tooltip text for hover
  @Column({ nullable: true })
  tooltip?: string;

  // Auto-assign condition (JSON) for automatic icon assignment
  @Column({ type: 'jsonb', nullable: true })
  autoAssignCondition?: AutoAssignCondition;

  @Column({ default: true })
  isActive!: boolean;

  @Column()
  companyId!: string;

  @ManyToOne(() => Company, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @OneToMany(() => ClientIconAssignment, (cia) => cia.icon)
  assignments?: ClientIconAssignment[];

  @CreateDateColumn()
  createdAt!: Date;
}
