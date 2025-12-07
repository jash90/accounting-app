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

@Entity('client_custom_field_values')
@Unique(['clientId', 'fieldDefinitionId'])
@Index(['clientId'])
@Index(['fieldDefinitionId'])
export class ClientCustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.customFieldValues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column()
  fieldDefinitionId!: string;

  @ManyToOne(() => ClientFieldDefinition, (fd) => fd.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fieldDefinitionId' })
  fieldDefinition!: ClientFieldDefinition;

  @Column({ type: 'text', nullable: true })
  value?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
