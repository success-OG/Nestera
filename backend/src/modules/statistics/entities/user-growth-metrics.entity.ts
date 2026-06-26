import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_growth_metrics')
@Index(['date', 'metricPeriod'])
@Index(['date'])
export class UserGrowthMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 20 })
  metricPeriod!: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Column('bigint')
  totalUsers!: number;

  @Column('bigint')
  newUsersCount!: number;

  @Column('bigint')
  activeUsers!: number;

  @Column('bigint')
  inactiveUsers!: number;

  @Column('bigint')
  churnedUsers!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  retentionRate!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  churnRate!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  growthRate!: number;

  @Column('jsonb', { nullable: true })
  usersByRegion?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  usersByType?: Record<string, number> | null;

  @Column('jsonb', { nullable: true })
  usersBySegment?: Record<string, number> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
