import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('transaction_metrics')
@Index(['date', 'metricPeriod'])
@Index(['date'])
export class TransactionMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 20 })
  metricPeriod!: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Column('bigint')
  totalTransactions!: number;

  @Column('bigint')
  successfulTransactions!: number;

  @Column('bigint')
  failedTransactions!: number;

  @Column('bigint')
  pendingTransactions!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalVolume!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  avgTransactionAmount!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  minTransactionAmount!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  maxTransactionAmount!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  successRate!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  failureRate!: number;

  @Column('decimal', { precision: 10, scale: 4 })
  avgGasUsed!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalGasSpent!: number;

  @Column('jsonb', { nullable: true })
  transactionsByType?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  transactionsByStatus?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  volumeByType?: Record<string, number> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
