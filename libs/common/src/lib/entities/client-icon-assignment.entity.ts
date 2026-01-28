import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Client } from './client.entity';
import { ClientIcon } from './client-icon.entity';

@Entity('client_icon_assignments')
@Unique(['clientId', 'iconId'])
@Index(['clientId'])
@Index(['iconId'])
export class ClientIconAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, (client) => client.iconAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column({ type: 'uuid' })
  iconId!: string;

  @ManyToOne(() => ClientIcon, (icon) => icon.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'iconId' })
  icon!: ClientIcon;

  @Column({ type: 'integer', default: 0 })
  displayOrder!: number;

  // Flag to indicate if this assignment was automatically created
  @Column({ type: 'boolean', default: false })
  isAutoAssigned!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
