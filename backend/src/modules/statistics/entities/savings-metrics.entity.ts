import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('savings_metrics')
@Index(['date', 'metricPeriod'])
@Index(['date'])
export class SavingsMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 20 })
  metricPeriod!: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Column('bigint')
  totalAccounts!: number;

  @Column('bigint')
  activeAccounts!: number;

  @Column('bigint')
  newAccounts!: number;

  @Column('bigint')
  closedAccounts!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalValueLocked!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  inflow!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  outflow!: number;

  @Column('decimal', { precision: 8, scale: 4 })
  avgApy!: number;

  @Column('decimal', { precision: 8, scale: 4 })
  minApy!: number;

  @Column('decimal', { precision: 8, scale: 4 })
  maxApy!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalInterestEarned!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  accountGrowthRate!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  tvlGrowthRate!: number;

  @Column('jsonb', { nullable: true })
  accountsByProduct?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  tvlByProduct?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  apyByProduct?: Record<string, number> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
