import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  MedicalClaim,
  ClaimStatus,
} from '../claims/entities/medical-claim.entity';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { AnalyticsOverviewDto } from './dto/analytics-overview.dto';
import { ProtocolMetrics } from './entities/protocol-metrics.entity';
import { OracleService } from './services/oracle.service';
import { SavingsService } from '../blockchain/savings.service';
import { User } from '../user/entities/user.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../savings/entities/user-subscription.entity';
import {
  Transaction,
  TxType,
  TxStatus,
} from '../transactions/entities/transaction.entity';
import {
  DateRangeFilterDto,
  DateRange,
} from '../admin/dto/admin-analytics.dto';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @InjectRepository(MedicalClaim)
    private readonly claimRepository: Repository<MedicalClaim>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(SavingsProduct)
    private readonly savingsProductRepository: Repository<SavingsProduct>,
    @InjectRepository(ProtocolMetrics)
    private readonly protocolMetricsRepository: Repository<ProtocolMetrics>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly oracleService: OracleService,
    private readonly savingsService: SavingsService,
  ) {}

  async getOverview(): Promise<AnalyticsOverviewDto> {
    const [
      totalProcessedSweeps,
      activeDisputes,
      pendingMedicalClaims,
      totalClaims,
      claimAmountResult,
    ] = await Promise.all([
      this.claimRepository.count({
        where: [
          { status: ClaimStatus.APPROVED },
          { status: ClaimStatus.REJECTED },
        ],
      }),
      this.disputeRepository.count({
        where: [
          { status: DisputeStatus.OPEN },
          { status: DisputeStatus.UNDER_REVIEW },
        ],
      }),
      this.claimRepository.count({ where: { status: ClaimStatus.PENDING } }),
      this.claimRepository.count(),
      this.claimRepository
        .createQueryBuilder('claim')
        .select('SUM(claim.claimAmount)', 'total')
        .getRawOne(),
    ]);

    return {
      totalProcessedSweeps,
      activeDisputes,
      pendingMedicalClaims,
      totalUsers: totalClaims,
      totalClaimAmount: parseFloat(claimAmountResult?.total || '0'),
    };
  }

  /**
   * Cron job that runs daily at 12:00 UTC to snapshot global TVL
   * Schedule: 0 0 12 * * * (12:00 UTC every day)
   */
  @ShutdownTrackedTask()
  @Cron('0 0 12 * * *')
  async snapshotGlobalTvl(): Promise<void> {
    this.logger.log('Starting global TVL snapshot job...');

    try {
      // Fetch all active savings products
      const savingsProducts = await this.savingsProductRepository.find({
        where: { isActive: true },
      });

      if (savingsProducts.length === 0) {
        this.logger.warn('No active savings products found');
        return;
      }

      this.logger.log(
        `Found ${savingsProducts.length} active savings products`,
      );

      // Fetch XLM price in USD
      const xlmPriceUsd = await this.oracleService.getAssetPrice('stellar');

      if (xlmPriceUsd === 0) {
        this.logger.error('Failed to fetch XLM price, aborting snapshot');
        return;
      }

      this.logger.log(`Current XLM price: $${xlmPriceUsd}`);

      // Iterate through each savings product and fetch total assets
      let totalValueLockedXlm = 0;
      const productBreakdown: Record<string, any> = {};

      for (const product of savingsProducts) {
        if (!product.contractId) {
          this.logger.warn(
            `Savings product ${product.id} (${product.name}) has no contract ID, skipping`,
          );
          continue;
        }

        try {
          const totalAssets = await this.savingsService.getVaultTotalAssets(
            product.contractId,
          );

          // Convert stroops to XLM
          const totalAssetsXlm = totalAssets / 10_000_000;
          totalValueLockedXlm += totalAssetsXlm;

          productBreakdown[product.id] = {
            name: product.name,
            type: product.type,
            contractId: product.contractId,
            totalAssetsStroops: totalAssets,
            totalAssetsXlm: totalAssetsXlm,
            totalAssetsUsd: totalAssetsXlm * xlmPriceUsd,
          };

          this.logger.log(
            `Product ${product.name}: ${totalAssetsXlm} XLM ($${totalAssetsXlm * xlmPriceUsd})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to fetch total assets for product ${product.id} (${product.name}): ${(error as Error).message}`,
          );
          productBreakdown[product.id] = {
            name: product.name,
            type: product.type,
            contractId: product.contractId,
            error: (error as Error).message,
          };
        }
      }

      // Calculate total value locked in USD
      const totalValueLockedUsd = totalValueLockedXlm * xlmPriceUsd;

      // Create and save protocol metrics snapshot
      const snapshot = this.protocolMetricsRepository.create({
        snapshotDate: new Date(),
        totalValueLockedUsd,
        totalValueLockedXlm,
        savingsProductCount: savingsProducts.length,
        productBreakdown,
      });

      await this.protocolMetricsRepository.save(snapshot);

      this.logger.log(
        `Global TVL snapshot completed: ${totalValueLockedXlm} XLM (${totalValueLockedUsd})`,
      );
    } catch (error) {
      this.logger.error(
        `Error during global TVL snapshot job: ${(error as Error).message}`,
        error,
      );
    }
  }

  /**
   * Calculate date range from filter
   */
  private calculateDateRange(filter: DateRangeFilterDto): {
    fromDate: Date;
    toDate: Date;
  } {
    const toDate = filter.toDate ? new Date(filter.toDate) : new Date();
    let fromDate: Date;

    if (filter.fromDate) {
      fromDate = new Date(filter.fromDate);
    } else {
      switch (filter.range) {
        case DateRange.LAST_7_DAYS:
          fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_30_DAYS:
          fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_90_DAYS:
          fromDate = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case DateRange.LAST_365_DAYS:
          fromDate = new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { fromDate, toDate };
  }

  /**
   * Get comprehensive platform overview
   */
  async getPlatformOverview(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalValueLocked: number;
    monthlyRevenue: number;
    avgSavingsPerUser: number;
    totalTransactions: number;
    activeSubscriptions: number;
    pendingClaims: number;
    activeDisputes: number;
  }> {
    const [
      totalUsers,
      activeUsers,
      totalValueLocked,
      monthlyRevenue,
      totalTransactions,
      activeSubscriptions,
      pendingClaims,
      activeDisputes,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.getTotalValueLocked(),
      this.getMonthlyRevenue(),
      this.transactionRepository.count(),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.claimRepository.count({ where: { status: ClaimStatus.PENDING } }),
      this.disputeRepository.count({
        where: [
          { status: DisputeStatus.OPEN },
          { status: DisputeStatus.IN_PROGRESS },
        ],
      }),
    ]);

    const avgSavingsPerUser =
      totalUsers > 0 ? totalValueLocked / totalUsers : 0;

    return {
      totalUsers,
      activeUsers,
      totalValueLocked,
      monthlyRevenue,
      avgSavingsPerUser,
      totalTransactions,
      activeSubscriptions,
      pendingClaims,
      activeDisputes,
    };
  }

  /**
   * Get total value locked from active subscriptions
   */
  private async getTotalValueLocked(): Promise<number> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('SUM(subscription.amount)', 'total')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get monthly revenue from fees
   */
  private async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // For now, calculate from transaction fees (assuming 1% fee)
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('transaction.status = :status', { status: TxStatus.COMPLETED })
      .getRawOne();

    const totalAmount = parseFloat(result?.total || '0');
    return totalAmount * 0.01; // 1% fee
  }

  /**
   * Get user analytics - growth, retention, churn metrics
   */
  async getUserAnalytics(filter: DateRangeFilterDto): Promise<{
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    churnedUsers: number;
    retentionRate: number;
    churnRate: number;
    growthRate: number;
    usersByTier: Record<string, number>;
    usersByKycStatus: Record<string, number>;
    userGrowthTrend: { date: string; count: number }[];
  }> {
    const { fromDate, toDate } = this.calculateDateRange(filter);

    const [
      totalUsers,
      newUsers,
      activeUsers,
      lastPeriodUsers,
      usersByTier,
      usersByKycStatus,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(fromDate),
        },
      }),
      this.userRepository.count({
        where: {
          lastLoginAt: MoreThanOrEqual(fromDate),
        },
      }),
      this.userRepository.count({
        where: {
          createdAt: LessThanOrEqual(fromDate),
        },
      }),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.tier')
        .getRawMany(),
      this.userRepository
        .createQueryBuilder('user')
        .select('user.kycStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.kycStatus')
        .getRawMany(),
    ]);

    // Calculate churn (users who haven't logged in during the period)
    const churnedUsers = totalUsers - activeUsers;

    // Calculate rates
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    const churnRate = totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0;
    const growthRate =
      lastPeriodUsers > 0 ? ((newUsers - 0) / lastPeriodUsers) * 100 : 0;

    // Format tier distribution
    const tierDistribution: Record<string, number> = {};
    for (const row of usersByTier) {
      tierDistribution[row.tier] = parseInt(row.count);
    }

    // Format KYC distribution
    const kycDistribution: Record<string, number> = {};
    for (const row of usersByKycStatus) {
      kycDistribution[row.status] = parseInt(row.count);
    }

    // Generate user growth trend (daily)
    const userGrowthTrend = await this.getUserGrowthTrend(fromDate, toDate);

    return {
      totalUsers,
      newUsers,
      activeUsers,
      churnedUsers,
      retentionRate,
      churnRate,
      growthRate,
      usersByTier: tierDistribution,
      usersByKycStatus: kycDistribution,
      userGrowthTrend,
    };
  }

  /**
   * Get user growth trend over time
   */
  private async getUserGrowthTrend(
    fromDate: Date,
    toDate: Date,
  ): Promise<{ date: string; count: number }[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :fromDate', { fromDate })
      .andWhere('user.createdAt <= :toDate', { toDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return users.map((u) => ({ date: u.date, count: parseInt(u.count) }));
  }

  /**
   * Get revenue analytics - fees, projections
   */
  async getRevenueAnalytics(filter: DateRangeFilterDto): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    revenueByType: Record<string, number>;
    revenueTrend: { date: string; amount: number }[];
    revenueProjection: { month: string; projected: number }[];
  }> {
    const { fromDate, toDate } = this.calculateDateRange(filter);

    // Get revenue from completed transactions (assuming 1% fee)
    const revenueData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
      .where('transaction.createdAt >= :fromDate', { fromDate })
      .andWhere('transaction.createdAt <= :toDate', { toDate })
      .andWhere('transaction.status = :status', { status: TxStatus.COMPLETED })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const totalRevenue =
      revenueData.reduce((sum, r) => sum + parseFloat(r.total || '0'), 0) *
      0.01;

    // Get current month revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyRevenueData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
      .where('transaction.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('transaction.status = :status', { status: TxStatus.COMPLETED })
      .getRawOne();
    const monthlyRevenue = parseFloat(monthlyRevenueData?.total || '0') * 0.01;

    // Revenue by transaction type
    const revenueByTypeData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
      .where('transaction.createdAt >= :fromDate', { fromDate })
      .andWhere('transaction.createdAt <= :toDate', { toDate })
      .andWhere('transaction.status = :status', { status: TxStatus.COMPLETED })
      .groupBy('transaction.type')
      .getRawMany();

    const revenueByType: Record<string, number> = {};
    for (const row of revenueByTypeData) {
      revenueByType[row.type] = parseFloat(row.total || '0') * 0.01;
    }

    // Revenue trend
    const revenueTrend = revenueData.map((r) => ({
      date: r.date,
      amount: parseFloat(r.total || '0') * 0.01,
    }));

    // Simple projection (next 3 months based on average)
    const avgMonthly =
      revenueTrend.length > 0
        ? revenueTrend.reduce((sum, r) => sum + r.amount, 0) /
          revenueTrend.length
        : 0;

    const revenueProjection: Array<{ month: string; projected: number }> = [];
    const currentMonth = new Date();
    for (let i = 1; i <= 3; i++) {
      const projectionDate = new Date(currentMonth);
      projectionDate.setMonth(currentMonth.getMonth() + i);
      revenueProjection.push({
        month: projectionDate.toISOString().slice(0, 7),
        projected: avgMonthly * (1 + i * 0.05), // 5% growth per month
      });
    }

    return {
      totalRevenue,
      monthlyRevenue,
      revenueByType,
      revenueTrend,
      revenueProjection,
    };
  }

  /**
   * Get savings analytics - TVL, APY, product performance
   */
  async getSavingsAnalytics(filter: DateRangeFilterDto): Promise<{
    totalValueLocked: number;
    avgSavingsPerUser: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    productPerformance: {
      productId: string;
      productName: string;
      tvl: number;
      apy: number;
      subscriptionCount: number;
    }[];
    apyDistribution: { range: string; count: number }[];
    savingsGrowthTrend: { date: string; tvl: number }[];
  }> {
    const { fromDate, toDate } = this.calculateDateRange(filter);

    // Get total TVL
    const totalValueLocked = await this.getTotalValueLocked();

    // Get subscription counts
    const [totalSubscriptions, activeSubscriptions] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
    ]);

    // Get average savings per user
    const totalUsers = await this.userRepository.count();
    const avgSavingsPerUser =
      totalUsers > 0 ? totalValueLocked / totalUsers : 0;

    // Get product performance
    const productPerformanceData = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.product', 'product')
      .select('subscription.productId', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(CAST(subscription.amount AS DECIMAL))', 'tvl')
      .addSelect('product.apy', 'apy')
      .addSelect('COUNT(*)', 'subscriptionCount')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .groupBy('subscription.productId, product.name, product.apy')
      .getRawMany();

    const productPerformance = productPerformanceData.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      tvl: parseFloat(p.tvl || '0'),
      apy: parseFloat(p.apy || '0'),
      subscriptionCount: parseInt(p.subscriptionCount),
    }));

    // APY distribution
    const products = await this.savingsProductRepository.find({
      where: { isActive: true },
    });
    const apyDistribution = [
      {
        range: '0-2%',
        count: products.filter((p) => p.interestRate >= 0 && p.interestRate < 2)
          .length,
      },
      {
        range: '2-5%',
        count: products.filter((p) => p.interestRate >= 2 && p.interestRate < 5)
          .length,
      },
      {
        range: '5-10%',
        count: products.filter(
          (p) => p.interestRate >= 5 && p.interestRate < 10,
        ).length,
      },
      {
        range: '10%+',
        count: products.filter((p) => p.interestRate >= 10).length,
      },
    ];

    // Savings growth trend (from ProtocolMetrics)
    const savingsGrowthTrend = await this.protocolMetricsRepository
      .createQueryBuilder('metrics')
      .select('DATE(metrics.snapshotDate)', 'date')
      .addSelect('metrics.totalValueLockedUsd', 'tvl')
      .where('metrics.snapshotDate >= :fromDate', { fromDate })
      .andWhere('metrics.snapshotDate <= :toDate', { toDate })
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      totalValueLocked,
      avgSavingsPerUser,
      totalSubscriptions,
      activeSubscriptions,
      productPerformance,
      apyDistribution,
      savingsGrowthTrend: savingsGrowthTrend.map((s) => ({
        date: s.date,
        tvl: parseFloat(s.tvl || '0'),
      })),
    };
  }

  /**
   * Get transaction analytics - volume trends
   */

  async getTransactionAnalytics(filter: DateRangeFilterDto): Promise<{
    totalTransactions: number;
    totalVolume: number;
    avgTransactionSize: number;
    transactionsByType: Record<string, number>;
    transactionsByStatus: Record<string, number>;
    transactionTrend: { date: string; count: number; volume: number }[];
  }> {
    const { fromDate, toDate } = this.calculateDateRange(filter);

    // Get transaction stats
    const [totalTransactions, volumeResult] = await Promise.all([
      this.transactionRepository.count({
        where: {
          createdAt: MoreThanOrEqual(fromDate),
        },
      }),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
        .where('transaction.createdAt >= :fromDate', { fromDate })
        .andWhere('transaction.createdAt <= :toDate', { toDate })
        .getRawOne(),
    ]);

    const totalVolume = parseFloat(volumeResult?.total || '0');
    const avgTransactionSize =
      totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    // Transactions by type
    const byTypeData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt >= :fromDate', { fromDate })
      .andWhere('transaction.createdAt <= :toDate', { toDate })
      .groupBy('transaction.type')
      .getRawMany();

    const transactionsByType: Record<string, number> = {};
    for (const row of byTypeData) {
      transactionsByType[row.type] = parseInt(row.count);
    }

    // Transactions by status
    const byStatusData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.createdAt >= :fromDate', { fromDate })
      .andWhere('transaction.createdAt <= :toDate', { toDate })
      .groupBy('transaction.status')
      .getRawMany();

    const transactionsByStatus: Record<string, number> = {};
    for (const row of byStatusData) {
      transactionsByStatus[row.status] = parseInt(row.count);
    }

    // Transaction trend
    const trendData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'volume')
      .where('transaction.createdAt >= :fromDate', { fromDate })
      .andWhere('transaction.createdAt <= :toDate', { toDate })
      .groupBy('DATE(transaction.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const transactionTrend = trendData.map((t) => ({
      date: t.date,
      count: parseInt(t.count),
      volume: parseFloat(t.volume || '0'),
    }));

    return {
      totalTransactions,
      totalVolume,
      avgTransactionSize,
      transactionsByType,
      transactionsByStatus,
      transactionTrend,
    };
  }
}
