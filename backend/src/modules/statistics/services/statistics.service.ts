import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  StatisticsQueryDto,
  TimeRange,
  MetricPeriod,
  ComparisonPeriod,
} from '../dto/statistics-query.dto';
import {
  UserGrowthDto,
  TransactionVolumeDto,
  SavingsMetricsDto,
  SystemHealthDto,
  ComparisonDto,
  DrillDownDto,
  StatisticsOverviewDto,
} from '../dto/statistics-response.dto';
import { UserGrowthMetrics } from '../entities/user-growth-metrics.entity';
import { TransactionMetrics } from '../entities/transaction-metrics.entity';
import { SavingsMetrics } from '../entities/savings-metrics.entity';
import { SystemHealthMetrics } from '../entities/system-health-metrics.entity';

function optionalRecord<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
import { SystemStatistics } from '../entities/system-statistics.entity';
import { StatisticsAggregationService } from './statistics-aggregation.service';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour for historical data

  constructor(
    @InjectRepository(UserGrowthMetrics)
    private readonly userGrowthRepository: Repository<UserGrowthMetrics>,
    @InjectRepository(TransactionMetrics)
    private readonly txMetricsRepository: Repository<TransactionMetrics>,
    @InjectRepository(SavingsMetrics)
    private readonly savingsMetricsRepository: Repository<SavingsMetrics>,
    @InjectRepository(SystemHealthMetrics)
    private readonly healthMetricsRepository: Repository<SystemHealthMetrics>,
    @InjectRepository(SystemStatistics)
    private readonly systemStatsRepository: Repository<SystemStatistics>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly aggregationService: StatisticsAggregationService,
  ) {}

  /**
   * Get user growth statistics with optional comparison and time-series data
   */
  async getUserGrowthStatistics(
    query: StatisticsQueryDto,
  ): Promise<UserGrowthDto> {
    try {
      const cacheKey = this.generateCacheKey('user_growth', query);
      const cached = await this.cacheManager.get<UserGrowthDto>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for user growth statistics: ${cacheKey}`);
        return cached;
      }

      const { startDate, endDate } = this.getDateRange(query);

      const metrics = await this.userGrowthRepository.find({
        where: {
          date: Between(startDate, endDate),
          metricPeriod: query.period || MetricPeriod.DAILY,
        },
        order: { date: 'DESC' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });

      if (metrics.length === 0) {
        throw new HttpException(
          'No user growth data found for the specified period',
          HttpStatus.NOT_FOUND,
        );
      }

      const latestMetric = metrics[0];
      const result: UserGrowthDto = {
        totalUsers: latestMetric.totalUsers,
        activeUsers: latestMetric.activeUsers,
        newUsersCount: latestMetric.newUsersCount,
        inactiveUsers: latestMetric.inactiveUsers,
        churnedUsers: latestMetric.churnedUsers,
        retentionRate: latestMetric.retentionRate,
        churnRate: latestMetric.churnRate,
        growthRate: latestMetric.growthRate,
        usersByRegion: optionalRecord(latestMetric.usersByRegion),
        usersBySegment: optionalRecord(latestMetric.usersBySegment),
        timeSeries: metrics.map((m) => ({
          timestamp: m.date,
          value: m.newUsersCount,
          previousValue:
            metrics[metrics.indexOf(m) + 1]?.newUsersCount || undefined,
        })),
      };

      if (query.compareWith) {
        result.comparison = await this.getComparison(
          query.compareWith,
          startDate,
          'user_growth',
        );
      }

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);
      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching user growth statistics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get transaction volume statistics with optional comparison and drill-down
   */
  async getTransactionVolumeStatistics(
    query: StatisticsQueryDto,
  ): Promise<TransactionVolumeDto> {
    try {
      const cacheKey = this.generateCacheKey('transaction_volume', query);
      const cached =
        await this.cacheManager.get<TransactionVolumeDto>(cacheKey);

      if (cached) {
        this.logger.debug(
          `Cache hit for transaction volume statistics: ${cacheKey}`,
        );
        return cached;
      }

      const { startDate, endDate } = this.getDateRange(query);

      const metrics = await this.txMetricsRepository.find({
        where: {
          date: Between(startDate, endDate),
          metricPeriod: query.period || MetricPeriod.DAILY,
        },
        order: { date: 'DESC' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });

      if (metrics.length === 0) {
        throw new HttpException(
          'No transaction data found for the specified period',
          HttpStatus.NOT_FOUND,
        );
      }

      const latestMetric = metrics[0];
      const aggregatedMetrics = this.aggregateTransactionMetrics(metrics);

      const result: TransactionVolumeDto = {
        totalTransactions: aggregatedMetrics.totalTransactions,
        successfulTransactions: aggregatedMetrics.successfulTransactions,
        failedTransactions: aggregatedMetrics.failedTransactions,
        pendingTransactions: aggregatedMetrics.pendingTransactions,
        totalVolume: aggregatedMetrics.totalVolume,
        avgTransactionAmount: aggregatedMetrics.avgTransactionAmount,
        minTransactionAmount: aggregatedMetrics.minTransactionAmount,
        maxTransactionAmount: aggregatedMetrics.maxTransactionAmount,
        successRate: aggregatedMetrics.successRate,
        failureRate: aggregatedMetrics.failureRate,
        avgGasUsed: aggregatedMetrics.avgGasUsed,
        totalGasSpent: aggregatedMetrics.totalGasSpent,
        transactionsByType: optionalRecord(latestMetric.transactionsByType),
        volumeByType: optionalRecord(latestMetric.volumeByType),
        timeSeries: metrics.map((m) => ({
          timestamp: m.date,
          value: m.totalVolume,
          previousValue:
            metrics[metrics.indexOf(m) + 1]?.totalVolume || undefined,
        })),
      };

      if (query.compareWith) {
        result.comparison = await this.getComparison(
          query.compareWith,
          startDate,
          'transaction_volume',
        );
      }

      if (query.filter) {
        result.drillDown = await this.getDrillDownData(
          query.filter,
          startDate,
          endDate,
          'transaction',
        );
      }

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);
      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching transaction statistics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get savings metrics with optional comparison and drill-down
   */
  async getSavingsStatistics(
    query: StatisticsQueryDto,
  ): Promise<SavingsMetricsDto> {
    try {
      const cacheKey = this.generateCacheKey('savings_metrics', query);
      const cached = await this.cacheManager.get<SavingsMetricsDto>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for savings statistics: ${cacheKey}`);
        return cached;
      }

      const { startDate, endDate } = this.getDateRange(query);

      const metrics = await this.savingsMetricsRepository.find({
        where: {
          date: Between(startDate, endDate),
          metricPeriod: query.period || MetricPeriod.DAILY,
        },
        order: { date: 'DESC' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      });

      if (metrics.length === 0) {
        throw new HttpException(
          'No savings data found for the specified period',
          HttpStatus.NOT_FOUND,
        );
      }

      const latestMetric = metrics[0];

      const result: SavingsMetricsDto = {
        totalAccounts: latestMetric.totalAccounts,
        activeAccounts: latestMetric.activeAccounts,
        newAccounts: latestMetric.newAccounts,
        closedAccounts: latestMetric.closedAccounts,
        totalValueLocked: latestMetric.totalValueLocked,
        inflow: latestMetric.inflow,
        outflow: latestMetric.outflow,
        avgApy: latestMetric.avgApy,
        minApy: latestMetric.minApy,
        maxApy: latestMetric.maxApy,
        totalInterestEarned: latestMetric.totalInterestEarned,
        accountGrowthRate: latestMetric.accountGrowthRate,
        tvlGrowthRate: latestMetric.tvlGrowthRate,
        accountsByProduct: optionalRecord(latestMetric.accountsByProduct),
        tvlByProduct: optionalRecord(latestMetric.tvlByProduct),
        apyByProduct: optionalRecord(latestMetric.apyByProduct),
        timeSeries: metrics.map((m) => ({
          timestamp: m.date,
          value: m.totalValueLocked,
          previousValue:
            metrics[metrics.indexOf(m) + 1]?.totalValueLocked || undefined,
        })),
      };

      if (query.compareWith) {
        result.comparison = await this.getComparison(
          query.compareWith,
          startDate,
          'savings_metrics',
        );
      }

      if (query.filter) {
        result.drillDown = await this.getDrillDownData(
          query.filter,
          startDate,
          endDate,
          'savings',
        );
      }

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching savings statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthStatistics(
    query: StatisticsQueryDto,
  ): Promise<SystemHealthDto> {
    try {
      const cacheKey = this.generateCacheKey('system_health', query);
      const cached = await this.cacheManager.get<SystemHealthDto>(cacheKey);

      if (cached) {
        this.logger.debug(
          `Cache hit for system health statistics: ${cacheKey}`,
        );
        return cached;
      }

      const { startDate, endDate } = this.getDateRange(query);

      const metrics = await this.healthMetricsRepository.find({
        where: {
          timestamp: Between(startDate, endDate),
        },
        order: { timestamp: 'DESC' },
        take: 1,
      });

      if (metrics.length === 0) {
        throw new HttpException(
          'No system health data found for the specified period',
          HttpStatus.NOT_FOUND,
        );
      }

      const latestMetric = metrics[0];

      const result: SystemHealthDto = {
        healthScore: latestMetric.healthScore,
        apiUptime: latestMetric.apiUptime,
        blockchainUptime: latestMetric.blockchainUptime,
        totalRequests: latestMetric.totalRequests,
        successfulRequests: latestMetric.successfulRequests,
        failedRequests: latestMetric.failedRequests,
        avgResponseTime: latestMetric.avgResponseTime,
        p95ResponseTime: latestMetric.p95ResponseTime,
        p99ResponseTime: latestMetric.p99ResponseTime,
        memoryUsage:
          (latestMetric.memoryUsed / latestMetric.memoryAvailable) * 100,
        cpuUsage: latestMetric.cpuUsage,
        diskUsage: latestMetric.diskUsage,
        cacheHitRate: latestMetric.cacheHitRate,
        serviceStatus: optionalRecord(latestMetric.serviceStatus),
        alerts: optionalRecord(latestMetric.alerts),
      };

      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);
      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching system health statistics: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive statistics overview
   */
  async getStatisticsOverview(
    query: StatisticsQueryDto,
  ): Promise<StatisticsOverviewDto> {
    try {
      const cacheKey = `statistics_overview_${Date.now()}`;
      const [userGrowth, transactions, savings, health] = await Promise.all([
        this.getUserGrowthStatistics(query),
        this.getTransactionVolumeStatistics(query),
        this.getSavingsStatistics(query),
        this.getSystemHealthStatistics(query),
      ]);

      return {
        userGrowth,
        transactionVolume: transactions,
        savingsMetrics: savings,
        systemHealth: health,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error generating statistics overview: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Clear specific cache entries
   */
  async clearCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys: string[] = [];
        for (const store of this.cacheManager.stores) {
          const storeKeys = await store.store.keys();
          keys.push(...storeKeys);
        }
        const matchingKeys = keys.filter((key) => key.includes(pattern));
        await Promise.all(
          matchingKeys.map((key) => this.cacheManager.del(key)),
        );
        this.logger.log(`Cleared ${matchingKeys.length} cache entries`);
      } else {
        await this.cacheManager.clear();
        this.logger.log('Cleared all cache entries');
      }
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cron job to aggregate statistics daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateStatisticsCron(): Promise<void> {
    try {
      this.logger.log('Starting daily statistics aggregation...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const tomorrow = new Date(yesterday);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Promise.all([
        this.aggregationService.aggregateUserGrowthMetrics(
          yesterday,
          tomorrow,
          'daily',
        ),
        this.aggregationService.aggregateTransactionMetrics(
          yesterday,
          tomorrow,
          'daily',
        ),
        this.aggregationService.aggregateSavingsMetrics(
          yesterday,
          tomorrow,
          'daily',
        ),
      ]);

      await this.clearCache();
      this.logger.log('Daily statistics aggregation completed');
    } catch (error) {
      this.logger.error(`Error in statistics aggregation: ${error.message}`);
    }
  }

  // Helper methods

  private generateCacheKey(type: string, query: StatisticsQueryDto): string {
    return `statistics:${type}:${query.range}:${query.period}:${
      query.compareWith || 'none'
    }:page_${query.page}`;
  }

  private getDateRange(query: StatisticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (query.range) {
      case TimeRange.LAST_7_DAYS:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case TimeRange.LAST_30_DAYS:
        startDate.setDate(startDate.getDate() - 30);
        break;
      case TimeRange.LAST_90_DAYS:
        startDate.setDate(startDate.getDate() - 90);
        break;
      case TimeRange.LAST_365_DAYS:
        startDate.setDate(startDate.getDate() - 365);
        break;
      case TimeRange.CUSTOM:
        if (query.fromDate && query.toDate) {
          return {
            startDate: new Date(query.fromDate),
            endDate: new Date(query.toDate),
          };
        }
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }

  private async getComparison(
    period: ComparisonPeriod,
    baseStartDate: Date,
    metricType: string,
  ): Promise<ComparisonDto> {
    const baseEndDate = new Date();
    const range = Math.ceil(
      (baseEndDate.getTime() - baseStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case ComparisonPeriod.PREVIOUS_PERIOD:
        previousEndDate = new Date(baseStartDate);
        previousStartDate = new Date(baseStartDate);
        previousStartDate.setDate(previousStartDate.getDate() - range);
        break;

      case ComparisonPeriod.SAME_PERIOD_LAST_YEAR:
        previousStartDate = new Date(baseStartDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate = new Date(baseEndDate);
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1);
        break;

      case ComparisonPeriod.SAME_PERIOD_LAST_MONTH:
        previousStartDate = new Date(baseStartDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(baseEndDate);
        previousEndDate.setMonth(previousEndDate.getMonth() - 1);
        break;

      default:
        throw new Error('Invalid comparison period');
    }

    // Fetch previous period data based on metric type
    const currentValue = 0;
    const previousValue = 0;

    // This would be implemented based on the specific metric type
    // For now, return a basic comparison
    return {
      previousValue,
      currentValue,
      change: currentValue - previousValue,
      changePercentage:
        previousValue > 0
          ? ((currentValue - previousValue) / previousValue) * 100
          : 0,
      trend:
        currentValue > previousValue
          ? 'up'
          : currentValue < previousValue
            ? 'down'
            : 'stable',
      comparisonPeriod: period,
    };
  }

  private async getDrillDownData(
    filter: string,
    startDate: Date,
    endDate: Date,
    metricType: string,
  ): Promise<DrillDownDto> {
    // Implement drill-down logic based on filter and metric type
    return {
      category: filter,
      breakdown: {},
      total: 0,
      percentage: 0,
    };
  }

  private aggregateTransactionMetrics(metrics: TransactionMetrics[]): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalVolume: number;
    avgTransactionAmount: number;
    minTransactionAmount: number;
    maxTransactionAmount: number;
    successRate: number;
    failureRate: number;
    avgGasUsed: number;
    totalGasSpent: number;
  } {
    return {
      totalTransactions: metrics.reduce(
        (sum, m) => sum + m.totalTransactions,
        0,
      ),
      successfulTransactions: metrics.reduce(
        (sum, m) => sum + m.successfulTransactions,
        0,
      ),
      failedTransactions: metrics.reduce(
        (sum, m) => sum + m.failedTransactions,
        0,
      ),
      pendingTransactions: metrics.reduce(
        (sum, m) => sum + m.pendingTransactions,
        0,
      ),
      totalVolume: metrics.reduce((sum, m) => sum + m.totalVolume, 0),
      avgTransactionAmount:
        metrics.reduce((sum, m) => sum + m.avgTransactionAmount, 0) /
        (metrics.length || 1),
      minTransactionAmount: Math.min(
        ...metrics.map((m) => m.minTransactionAmount),
      ),
      maxTransactionAmount: Math.max(
        ...metrics.map((m) => m.maxTransactionAmount),
      ),
      successRate:
        metrics.reduce((sum, m) => sum + m.successRate, 0) /
        (metrics.length || 1),
      failureRate:
        metrics.reduce((sum, m) => sum + m.failureRate, 0) /
        (metrics.length || 1),
      avgGasUsed:
        metrics.reduce((sum, m) => sum + m.avgGasUsed, 0) /
        (metrics.length || 1),
      totalGasSpent: metrics.reduce((sum, m) => sum + m.totalGasSpent, 0),
    };
  }
}
