import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsExportDataType {
  ALL = 'all',
  USERS = 'users',
  TRANSACTIONS = 'transactions',
  SAVINGS = 'savings',
  HEALTH = 'health',
}

export enum AnalyticsExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
}

export enum AnalyticsExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('analytics_export_jobs')
@Index(['userId', 'status'])
@Index(['createdAt'])
export class AnalyticsExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  dataType!: AnalyticsExportDataType;

  @Column({ type: 'varchar', length: 16 })
  format!: AnalyticsExportFormat;

  @Column({ type: 'varchar', length: 32, nullable: true })
  range?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fromDate?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  toDate?: Date | null;

  @Column({ type: 'varchar', length: 32, default: AnalyticsExportStatus.PENDING })
  status!: AnalyticsExportStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  queueJobId?: string | null;

  @Column({ type: 'text', nullable: true })
  filePath?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  requestPayload?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
