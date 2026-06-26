import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SavingsGoal } from './savings-goal.entity';
import { SavingsProduct } from './savings-product.entity';

export enum GoalTransferFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum GoalTransferStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

@Entity('goal_transfer_schedules')
export class GoalTransferSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  goalId: string;

  @Column('uuid', { nullable: true })
  productId: string | null;

  @Column('decimal', { precision: 14, scale: 7 })
  amount: number;

  @Column({ type: 'enum', enum: GoalTransferFrequency })
  frequency: GoalTransferFrequency;

  @Column({
    type: 'enum',
    enum: GoalTransferStatus,
    default: GoalTransferStatus.ACTIVE,
  })
  status: GoalTransferStatus;

  @Column({ type: 'timestamptz' })
  nextRunAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => SavingsGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: SavingsGoal;

  @ManyToOne(() => SavingsProduct, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product: SavingsProduct | null;
}

export enum GoalTransferExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('goal_transfer_executions')
export class GoalTransferExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  scheduleId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  goalId: string;

  @Column('decimal', { precision: 14, scale: 7 })
  amount: number;

  @Column({ type: 'enum', enum: GoalTransferExecutionStatus })
  status: GoalTransferExecutionStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  executedAt: Date;

  @ManyToOne(() => GoalTransferSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: GoalTransferSchedule;
}
