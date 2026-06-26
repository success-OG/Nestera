import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { User } from '../../../modules/user/entities/user.entity';
import {
  Transaction,
  TxType,
  TxStatus,
} from '../../../modules/transactions/entities/transaction.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../../../modules/savings/entities/user-subscription.entity';
import { SystemStatistics } from '../entities/system-statistics.entity';
import { UserGrowthMetrics } from '../entities/user-growth-metrics.entity';
import { TransactionMetrics } from '../entities/transaction-metrics.entity';
import { SavingsMetrics } from '../entities/savings-metrics.entity';
import { SystemHealthMetrics } from '../entities/system-health-metrics.entity';

@Injectable()
export class StatisticsAggregationService {
  private readonly logger = new Logger(StatisticsAggregationService.name);

  private normalizeMetricPeriod(
    metricType: 'daily' | 'hourly' | 'weekly' | 'monthly',
  ): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    return metricType === 'hourly' ? 'daily' : metricType;
  }

  private parseAmount(amount: string | number | null | undefined): number {
    const value = Number(amount ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(SystemStatistics)
    private readonly systemStatsRepository: Repository<SystemStatistics>,
    @InjectRepository(UserGrowthMetrics)
    private readonly userGrowthRepository: Repository<UserGrowthMetrics>,
    @InjectRepository(TransactionMetrics)
    private readonly txMetricsRepository: Repository<TransactionMetrics>,
    @InjectRepository(SavingsMetrics)
    private readonly savingsMetricsRepository: Repository<SavingsMetrics>,
    @InjectRepository(SystemHealthMetrics)
    private readonly healthMetricsRepository: Repository<SystemHealthMetrics>,
  ) {}

  async aggregateUserGrowthMetrics(
    startDate: Date,
    endDate: Date,
    metricType: 'daily' | 'hourly' | 'weekly' | 'monthly' = 'daily',
  ): Promise<UserGrowthMetrics[]> {
    this.logger.log(
      `Aggregating user growth metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const users = await this.userRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const previousUsers = await this.userRepository.count({
      where: {
        createdAt: LessThanOrEqual(startDate),
      },
    });

    const activeUsers = await this.userRepository.count({
      where: {
        createdAt: Between(startDate, endDate),
        isActive: true,
      },
    });

    const currentTotalUsers = await this.userRepository.count();

    const previousMetrics = await this.userGrowthRepository.findOne({
      where: {
        date: MoreThanOrEqual(new Date(startDate.getTime() - 86400000)),
      },
      order: { date: 'DESC' },
    });

    const retentionRate =
      previousUsers > 0
        ? ((currentTotalUsers - previousUsers) / previousUsers) * 100
        : 0;

    const growthRate =
      previousMetrics && previousMetrics.totalUsers > 0
        ? ((currentTotalUsers - previousMetrics.totalUsers) /
            previousMetrics.totalUsers) *
          100
        : 0;

    const churnRate = 100 - retentionRate;

    const metric = new UserGrowthMetrics();
    metric.date = startDate;
    metric.metricPeriod = this.normalizeMetricPeriod(metricType);
    metric.totalUsers = currentTotalUsers;
    metric.newUsersCount = users.length;
    metric.activeUsers = activeUsers;
    metric.inactiveUsers = currentTotalUsers - activeUsers;
    metric.churnedUsers = Math.max(
      0,
      (previousMetrics?.totalUsers || 0) - currentTotalUsers,
    );
    metric.retentionRate = Math.max(0, Math.min(100, retentionRate));
    metric.churnRate = Math.max(0, Math.min(100, churnRate));
    metric.growthRate = growthRate;
    metric.usersByRegion = await this.groupUsersByRegion(startDate, endDate);
    metric.usersByType = await this.groupUsersByType(startDate, endDate);
    metric.usersBySegment = await this.groupUsersBySegment(startDate, endDate);

    return [await this.userGrowthRepository.save(metric)];
  }

  async aggregateTransactionMetrics(
    startDate: Date,
    endDate: Date,
    metricType: 'daily' | 'hourly' | 'weekly' | 'monthly' = 'daily',
  ): Promise<TransactionMetrics[]> {
    this.logger.log(
      `Aggregating transaction metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const transactions = await this.transactionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(
      (t) => t.status === TxStatus.COMPLETED,
    ).length;
    const failedTransactions = transactions.filter(
      (t) => t.status === TxStatus.FAILED,
    ).length;
    const pendingTransactions = transactions.filter(
      (t) => t.status === TxStatus.PENDING,
    ).length;

    const totalVolume = transactions.reduce(
      (sum, t) => sum + this.parseAmount(t.amount),
      0,
    );
    const avgTransactionAmount =
      totalTransactions > 0 ? totalVolume / totalTransactions : 0;
    const amounts = transactions.map((t) => this.parseAmount(t.amount));
    const minTransactionAmount = amounts.length ? Math.min(...amounts) : 0;
    const maxTransactionAmount = amounts.length ? Math.max(...amounts) : 0;

    const successRate =
      totalTransactions > 0
        ? (successfulTransactions / totalTransactions) * 100
        : 0;
    const failureRate =
      totalTransactions > 0
        ? (failedTransactions / totalTransactions) * 100
        : 0;

    const gasUsageData = transactions.map(() => 0);
    const avgGasUsed =
      gasUsageData.length > 0
        ? gasUsageData.reduce((a, b) => a + b, 0) / gasUsageData.length
        : 0;
    const totalGasSpent = gasUsageData.reduce((a, b) => a + b, 0);

    const metric = new TransactionMetrics();
    metric.date = startDate;
    metric.metricPeriod = this.normalizeMetricPeriod(metricType);
    metric.totalTransactions = totalTransactions;
    metric.successfulTransactions = successfulTransactions;
    metric.failedTransactions = failedTransactions;
    metric.pendingTransactions = pendingTransactions;
    metric.totalVolume = totalVolume;
    metric.avgTransactionAmount = avgTransactionAmount;
    metric.minTransactionAmount = minTransactionAmount;
    metric.maxTransactionAmount = maxTransactionAmount;
    metric.successRate = Math.max(0, Math.min(100, successRate));
    metric.failureRate = Math.max(0, Math.min(100, failureRate));
    metric.avgGasUsed = avgGasUsed;
    metric.totalGasSpent = totalGasSpent;
    metric.transactionsByType = await this.groupTransactionsByType(
      startDate,
      endDate,
    );
    metric.volumeByType = await this.groupVolumeByType(startDate, endDate);
    metric.transactionsByStatus = {
      [TxStatus.COMPLETED]: successfulTransactions,
      [TxStatus.FAILED]: failedTransactions,
      [TxStatus.PENDING]: pendingTransactions,
    };

    return [await this.txMetricsRepository.save(metric)];
  }

  async aggregateSavingsMetrics(
    startDate: Date,
    endDate: Date,
    metricType: 'daily' | 'hourly' | 'weekly' | 'monthly' = 'daily',
  ): Promise<SavingsMetrics[]> {
    this.logger.log(
      `Aggregating savings metrics from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const subscriptions = await this.subscriptionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['product'],
    });

    const activeSubscriptions = await this.subscriptionRepository.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const totalAccounts = await this.subscriptionRepository.count();
    const newAccounts = subscriptions.length;

    const accountsByProduct = await this.groupAccountsByProduct(
      startDate,
      endDate,
    );
    const tvlByProduct = await this.calculateTvlByProduct(startDate, endDate);
    const apyByProduct = await this.calculateApyByProduct(startDate, endDate);

    const totalValueLocked = Object.values(tvlByProduct || {}).reduce(
      (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
      0,
    );

    const previousMetrics = await this.savingsMetricsRepository.findOne({
      where: {
        date: MoreThanOrEqual(new Date(startDate.getTime() - 86400000)),
      },
      order: { date: 'DESC' },
    });

    const accountGrowthRate =
      previousMetrics && previousMetrics.totalAccounts > 0
        ? ((totalAccounts - previousMetrics.totalAccounts) /
            previousMetrics.totalAccounts) *
          100
        : 0;

    const tvlGrowthRate =
      previousMetrics && previousMetrics.totalValueLocked > 0
        ? ((totalValueLocked - previousMetrics.totalValueLocked) /
            previousMetrics.totalValueLocked) *
          100
        : 0;

    const apyValues = Object.values(apyByProduct || {})
      .map((val: any) => (typeof val === 'number' ? val : 0))
      .filter((v) => v > 0);
    const avgApy =
      apyValues.length > 0
        ? apyValues.reduce((a: number, b: number) => a + b, 0) /
          apyValues.length
        : 0;

    const metric = new SavingsMetrics();
    metric.date = startDate;
    metric.metricPeriod = this.normalizeMetricPeriod(metricType);
    metric.totalAccounts = totalAccounts;
    metric.activeAccounts = activeSubscriptions;
    metric.newAccounts = newAccounts;
    metric.closedAccounts = 0; // Would need to track closures
    metric.totalValueLocked = totalValueLocked;
    metric.inflow = 0; // Would need to track deposits
    metric.outflow = 0; // Would need to track withdrawals
    metric.avgApy = avgApy;
    metric.minApy = Math.min(...apyValues, 0);
    metric.maxApy = Math.max(...apyValues, 0);
    metric.totalInterestEarned = 0; // Would need to calculate
    metric.accountGrowthRate = accountGrowthRate;
    metric.tvlGrowthRate = tvlGrowthRate;
    metric.accountsByProduct = accountsByProduct;
    metric.tvlByProduct = tvlByProduct;
    metric.apyByProduct = apyByProduct;

    return [await this.savingsMetricsRepository.save(metric)];
  }

  // Helper methods for grouping and calculations
  private async groupUsersByRegion(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.country', 'region')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('user.country')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.region || 'Unknown'] = parseInt(r.count, 10);
    });
    return grouped;
  }

  private async groupUsersByType(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.userType', 'type')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('user.userType')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.type || 'Unknown'] = parseInt(r.count, 10);
    });
    return grouped;
  }

  private async groupUsersBySegment(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    // Segment users by subscription status
    const result = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('sub.status', 'segment')
      .addSelect('COUNT(DISTINCT sub.userId)', 'count')
      .where('sub.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('sub.status')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.segment || 'Unknown'] = parseInt(r.count, 10);
    });
    return grouped;
  }

  private async groupTransactionsByType(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('COUNT(tx.id)', 'count')
      .where('tx.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('tx.type')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.type || 'Unknown'] = parseInt(r.count, 10);
    });
    return grouped;
  }

  private async groupVolumeByType(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'volume')
      .where('tx.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('tx.type')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.type || 'Unknown'] = parseFloat(r.volume || '0');
    });
    return grouped;
  }

  private async groupAccountsByProduct(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('product.name', 'product')
      .addSelect('COUNT(sub.id)', 'count')
      .leftJoin('sub.product', 'product')
      .where('sub.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('product.id')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.product || 'Unknown'] = parseInt(r.count, 10);
    });
    return grouped;
  }

  private async calculateTvlByProduct(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('product.name', 'product')
      .addSelect('SUM(sub.investmentAmount)', 'tvl')
      .leftJoin('sub.product', 'product')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('product.id')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.product || 'Unknown'] = parseFloat(r.tvl || '0');
    });
    return grouped;
  }

  private async calculateApyByProduct(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('product.name', 'product')
      .addSelect('AVG(product.apy)', 'apy')
      .leftJoin('sub.product', 'product')
      .where('sub.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('product.id')
      .getRawMany();

    const grouped: Record<string, number> = {};
    result.forEach((r) => {
      grouped[r.product || 'Unknown'] = parseFloat(r.apy || '0');
    });
    return grouped;
  }
}
