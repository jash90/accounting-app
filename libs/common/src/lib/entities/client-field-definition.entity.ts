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
import { Company } from './company.entity';
import { User } from './user.entity';
import { CustomFieldType } from '../enums/custom-field-type.enum';
import { ClientCustomFieldValue } from './client-custom-field-value.entity';

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

@Entity('client_field_definitions')
@Index(['companyId'])
export class ClientFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  label!: string;

  @Column({
    type: 'enum',
    enum: CustomFieldType,
  })
  fieldType!: CustomFieldType;

  @Column({ type: 'jsonb', nullable: true })
  enumValues?: string[]; // For ENUM type

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  validationRules?: ValidationRule;

  @Column({ type: 'integer', default: 0 })
  displayOrder!: number;

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

  @OneToMany(() => ClientCustomFieldValue, (cfv) => cfv.fieldDefinition)
  values?: ClientCustomFieldValue[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
