import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_health_metrics')
@Index(['timestamp'])
export class SystemHealthMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column('decimal', { precision: 5, scale: 2 })
  healthScore!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  apiUptime!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  blockchainUptime!: number;

  @Column('bigint')
  totalRequests!: number;

  @Column('bigint')
  successfulRequests!: number;

  @Column('bigint')
  failedRequests!: number;

  @Column('decimal', { precision: 10, scale: 4 })
  avgResponseTime!: number;

  @Column('decimal', { precision: 10, scale: 4 })
  p95ResponseTime!: number;

  @Column('decimal', { precision: 10, scale: 4 })
  p99ResponseTime!: number;

  @Column('bigint')
  memoryUsed!: number;

  @Column('bigint')
  memoryAvailable!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  cpuUsage!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  databaseConnections!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  cacheHitRate!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  diskUsage!: number;

  @Column('jsonb', { nullable: true })
  serviceStatus?: Record<string, any> | null;

  @Column('jsonb', { nullable: true })
  alerts?: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
