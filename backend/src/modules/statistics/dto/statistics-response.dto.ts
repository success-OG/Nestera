import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeSeriesDataPointDto {
  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: Date;

  @ApiProperty({ type: Number })
  value: number;

  @ApiPropertyOptional({ type: Number })
  previousValue?: number;

  @ApiPropertyOptional({ type: Number })
  change?: number;

  @ApiPropertyOptional({ type: Number })
  changePercentage?: number;
}

export class ComparisonDto {
  @ApiProperty({ type: Number })
  previousValue: number;

  @ApiProperty({ type: Number })
  currentValue: number;

  @ApiProperty({ type: Number })
  change: number;

  @ApiProperty({ type: Number })
  changePercentage: number;

  @ApiProperty({ type: String })
  trend: 'up' | 'down' | 'stable';

  @ApiPropertyOptional({ type: String })
  comparisonPeriod?: string;
}

export class DrillDownDto {
  @ApiProperty({ type: String })
  category: string;

  @ApiProperty({ type: Object })
  breakdown: Record<string, any>;

  @ApiPropertyOptional({ type: [TimeSeriesDataPointDto] })
  timeSeries?: TimeSeriesDataPointDto[];

  @ApiPropertyOptional({ type: Number })
  total?: number;

  @ApiPropertyOptional({ type: Number })
  percentage?: number;
}

export class UserGrowthDto {
  @ApiProperty({ type: Number })
  totalUsers: number;

  @ApiProperty({ type: Number })
  activeUsers: number;

  @ApiProperty({ type: Number })
  newUsersCount: number;

  @ApiProperty({ type: Number })
  inactiveUsers: number;

  @ApiProperty({ type: Number })
  churnedUsers: number;

  @ApiProperty({ type: Number })
  retentionRate: number;

  @ApiProperty({ type: Number })
  churnRate: number;

  @ApiProperty({ type: Number })
  growthRate: number;

  @ApiPropertyOptional({ type: Object })
  usersByRegion?: Record<string, number>;

  @ApiPropertyOptional({ type: Object })
  usersBySegment?: Record<string, number>;

  @ApiPropertyOptional({ type: [TimeSeriesDataPointDto] })
  timeSeries?: TimeSeriesDataPointDto[];

  @ApiPropertyOptional({ type: () => ComparisonDto })
  comparison?: ComparisonDto;
}

export class TransactionVolumeDto {
  @ApiProperty({ type: Number })
  totalTransactions: number;

  @ApiProperty({ type: Number })
  successfulTransactions: number;

  @ApiProperty({ type: Number })
  failedTransactions: number;

  @ApiProperty({ type: Number })
  pendingTransactions: number;

  @ApiProperty({ type: Number })
  totalVolume: number;

  @ApiProperty({ type: Number })
  avgTransactionAmount: number;

  @ApiProperty({ type: Number })
  minTransactionAmount: number;

  @ApiProperty({ type: Number })
  maxTransactionAmount: number;

  @ApiProperty({ type: Number })
  successRate: number;

  @ApiProperty({ type: Number })
  failureRate: number;

  @ApiProperty({ type: Number })
  avgGasUsed: number;

  @ApiProperty({ type: Number })
  totalGasSpent: number;

  @ApiPropertyOptional({ type: Object })
  transactionsByType?: Record<string, number>;

  @ApiPropertyOptional({ type: Object })
  volumeByType?: Record<string, number>;

  @ApiPropertyOptional({ type: [TimeSeriesDataPointDto] })
  timeSeries?: TimeSeriesDataPointDto[];

  @ApiPropertyOptional({ type: () => ComparisonDto })
  comparison?: ComparisonDto;

  @ApiPropertyOptional({ type: () => DrillDownDto })
  drillDown?: DrillDownDto;
}

export class SavingsMetricsDto {
  @ApiProperty({ type: Number })
  totalAccounts: number;

  @ApiProperty({ type: Number })
  activeAccounts: number;

  @ApiProperty({ type: Number })
  newAccounts: number;

  @ApiProperty({ type: Number })
  closedAccounts: number;

  @ApiProperty({ type: Number })
  totalValueLocked: number;

  @ApiProperty({ type: Number })
  inflow: number;

  @ApiProperty({ type: Number })
  outflow: number;

  @ApiProperty({ type: Number })
  avgApy: number;

  @ApiProperty({ type: Number })
  minApy: number;

  @ApiProperty({ type: Number })
  maxApy: number;

  @ApiProperty({ type: Number })
  totalInterestEarned: number;

  @ApiProperty({ type: Number })
  accountGrowthRate: number;

  @ApiProperty({ type: Number })
  tvlGrowthRate: number;

  @ApiPropertyOptional({ type: Object })
  accountsByProduct?: Record<string, number>;

  @ApiPropertyOptional({ type: Object })
  tvlByProduct?: Record<string, number>;

  @ApiPropertyOptional({ type: Object })
  apyByProduct?: Record<string, number>;

  @ApiPropertyOptional({ type: [TimeSeriesDataPointDto] })
  timeSeries?: TimeSeriesDataPointDto[];

  @ApiPropertyOptional({ type: () => ComparisonDto })
  comparison?: ComparisonDto;

  @ApiPropertyOptional({ type: () => DrillDownDto })
  drillDown?: DrillDownDto;
}

export class SystemHealthDto {
  @ApiProperty({ type: Number })
  healthScore: number;

  @ApiProperty({ type: Number })
  apiUptime: number;

  @ApiProperty({ type: Number })
  blockchainUptime: number;

  @ApiProperty({ type: Number })
  totalRequests: number;

  @ApiProperty({ type: Number })
  successfulRequests: number;

  @ApiProperty({ type: Number })
  failedRequests: number;

  @ApiProperty({ type: Number })
  avgResponseTime: number;

  @ApiProperty({ type: Number })
  p95ResponseTime: number;

  @ApiProperty({ type: Number })
  p99ResponseTime: number;

  @ApiProperty({ type: Number })
  memoryUsage: number;

  @ApiProperty({ type: Number })
  cpuUsage: number;

  @ApiProperty({ type: Number })
  diskUsage: number;

  @ApiProperty({ type: Number })
  cacheHitRate: number;

  @ApiPropertyOptional({ type: Object })
  serviceStatus?: Record<string, any>;

  @ApiPropertyOptional({ type: Array })
  alerts?: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;
}

export class StatisticsOverviewDto {
  @ApiProperty({ type: UserGrowthDto })
  userGrowth: UserGrowthDto;

  @ApiProperty({ type: TransactionVolumeDto })
  transactionVolume: TransactionVolumeDto;

  @ApiProperty({ type: SavingsMetricsDto })
  savingsMetrics: SavingsMetricsDto;

  @ApiProperty({ type: SystemHealthDto })
  systemHealth: SystemHealthDto;

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt: Date;

  @ApiPropertyOptional({ type: String })
  note?: string;
}

export class StatisticsExportDto {
  @ApiProperty({ type: String })
  format: 'json' | 'csv' | 'xlsx';

  @ApiProperty({ type: String })
  dataType: 'all' | 'users' | 'transactions' | 'savings' | 'health';

  @ApiProperty({ type: String })
  fileName: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt: Date;
}
