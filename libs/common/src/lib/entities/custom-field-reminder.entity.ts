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
import { ClientCustomFieldValue } from './client-custom-field-value.entity';
import { ClientFieldDefinition } from './client-field-definition.entity';
import { Client } from './client.entity';
import { Company } from './company.entity';

/**
 * Entity tracking reminders for custom fields of type DATE_RANGE_WITH_REMINDER.
 * Stores the date range and notification flags for reminder functionality.
 */
@Entity('custom_field_reminders')
@Index(['companyId'])
@Index(['clientId'])
@Index(['fieldDefinitionId'])
@Index(['endDate'])
@Index(['companyId', 'clientId'])
export class CustomFieldReminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ type: 'uuid' })
  fieldDefinitionId!: string;

  @ManyToOne(() => ClientFieldDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldDefinitionId' })
  fieldDefinition!: ClientFieldDefinition;

  @Column({ type: 'uuid' })
  fieldValueId!: string;

  @ManyToOne(() => ClientCustomFieldValue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldValueId' })
  fieldValue!: ClientCustomFieldValue;

  /**
   * Start date of the date range.
   */
  @Column({ type: 'date' })
  startDate!: Date;

  /**
   * End date of the date range - used for reminder calculations.
   */
  @Column({ type: 'date' })
  endDate!: Date;

  /**
   * Whether the 7-day reminder before end date has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate7DayReminderSent!: boolean;

  /**
   * Whether the 1-day reminder before end date has been sent.
   */
  @Column({ type: 'boolean', default: false })
  endDate1DayReminderSent!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
