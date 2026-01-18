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

  @Column()
  name!: string;

  @Column()
  label!: string;

  @Column({
    type: 'enum',
    enum: CustomFieldType,
  })
  fieldType!: CustomFieldType;

  @Column({ type: 'jsonb', nullable: true })
  enumValues?: string[]; // For ENUM type

  @Column({ default: false })
  isRequired!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  validationRules?: ValidationRule;

  @Column({ default: 0 })
  displayOrder!: number;

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

  @OneToMany(() => ClientCustomFieldValue, (cfv) => cfv.fieldDefinition)
  values?: ClientCustomFieldValue[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
