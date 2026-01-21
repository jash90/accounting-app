import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Client } from './client.entity';
import { Company } from './company.entity';
import { DeleteRequestStatus } from '../enums/delete-request-status.enum';

@Entity('client_delete_requests')
@Index(['companyId'])
@Index(['status'])
@Index(['clientId'])
export class ClientDeleteRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  requestedById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedById' })
  requestedBy!: User;

  @Column({
    type: 'enum',
    enum: DeleteRequestStatus,
    default: DeleteRequestStatus.PENDING,
  })
  status!: DeleteRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid', nullable: true })
  processedById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'processedById' })
  processedBy?: User;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;
}
