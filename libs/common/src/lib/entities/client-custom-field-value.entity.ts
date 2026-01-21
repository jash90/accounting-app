import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Client } from './client.entity';
import { ClientFieldDefinition } from './client-field-definition.entity';
import { Company } from './company.entity';

@Entity('client_custom_field_values')
@Unique(['companyId', 'clientId', 'fieldDefinitionId'])
@Index(['clientId'])
@Index(['fieldDefinitionId'])
@Index(['companyId'])
export class ClientCustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.customFieldValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  fieldDefinitionId!: string;

  @ManyToOne(() => ClientFieldDefinition, (fd) => fd.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldDefinitionId' })
  fieldDefinition!: ClientFieldDefinition;

  @Column({ type: 'text', nullable: true })
  value?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
