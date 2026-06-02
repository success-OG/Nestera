import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_statistics')
@Index(['timestamp'], { unique: true })
@Index(['metricType', 'timestamp'])
export class SystemStatistics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 50 })
  metricType!: 'daily' | 'hourly' | 'weekly' | 'monthly';

  @Column('bigint')
  totalUsers!: number;

  @Column('bigint')
  activeUsers!: number;

  @Column('bigint')
  newUsersCount!: number;

  @Column('bigint')
  totalTransactions!: number;

  @Column('bigint')
  failedTransactions!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalTransactionVolume!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  avgTransactionAmount!: number;

  @Column('bigint')
  totalSavingsAccounts!: number;

  @Column('bigint')
  activeSavingsAccounts!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalValueLocked!: number;

  @Column('decimal', { precision: 8, scale: 4 })
  avgApy!: number;

  @Column('bigint')
  totalMedicalClaims!: number;

  @Column('bigint')
  approvedClaims!: number;

  @Column('decimal', { precision: 20, scale: 2 })
  totalClaimsAmount!: number;

  @Column('bigint')
  activeDisputes!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  systemHealthScore!: number;

  @Column('jsonb', { nullable: true })
  additionalMetrics?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}
