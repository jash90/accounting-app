import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity('simple_texts')
export class SimpleText {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.simpleTexts, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company | null;

  @Column({ type: 'text' })
  content!: string;

  @Column()
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

