import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as request from 'supertest';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './services/statistics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { StatisticsAggregationService } from './services/statistics-aggregation.service';
import { StatisticsUtilsService } from './services/statistics-utils.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  UserGrowthDto,
  TransactionVolumeDto,
  SavingsMetricsDto,
  SystemHealthDto,
  StatisticsOverviewDto,
} from './dto/statistics-response.dto';
import {
  AnalyticsExportFormat,
  AnalyticsExportStatus,
} from './entities/analytics-export-job.entity';
import { UserGrowthMetrics } from './entities/user-growth-metrics.entity';
import { TransactionMetrics } from './entities/transaction-metrics.entity';
import { SavingsMetrics } from './entities/savings-metrics.entity';
import { SystemHealthMetrics } from './entities/system-health-metrics.entity';
import { SystemStatistics } from './entities/system-statistics.entity';
import { User } from '../user/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';

describe('Statistics API (e2e)', () => {
  let app: INestApplication;
  let statisticsService: StatisticsService;
  let cacheManager: any;
  const adminToken =
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6ImFkbWluIn0.signature';

  beforeAll(async () => {
    const mockRepositories = {
      UserGrowthMetricsRepository: {
        find: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
      },
      TransactionMetricsRepository: {
        find: jest.fn(),
        save: jest.fn(),
      },
      SavingsMetricsRepository: {
        find: jest.fn(),
        save: jest.fn(),
      },
      SystemHealthMetricsRepository: {
        find: jest.fn(),
        save: jest.fn(),
      },
      SystemStatisticsRepository: {
        find: jest.fn(),
        save: jest.fn(),
      },
      UserRepository: {
        find: jest.fn(),
        count: jest.fn(),
      },
      TransactionRepository: {
        find: jest.fn(),
      },
      UserSubscriptionRepository: {
        find: jest.fn(),
        count: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        StatisticsService,
        StatisticsAggregationService,
        StatisticsUtilsService,
        {
          provide: AnalyticsExportService,
          useValue: {
            exportDirect: jest.fn(async (dataType, query, format) => {
              if (!['json', 'csv', 'xlsx'].includes(format)) {
                throw new BadRequestException(
                  'Invalid analytics export format',
                );
              }

              const payload = {
                dataType,
                generatedAt: new Date().toISOString(),
                range: query?.range ?? '30d',
                sections: [
                  {
                    name: 'overview',
                    rows: [{ totalUsers: 10, totalTransactions: 20 }],
                  },
                ],
              };

              if (format === 'json') {
                return {
                  format,
                  fileName: `analytics_${dataType}.json`,
                  contentType: 'application/json',
                  buffer: Buffer.from(JSON.stringify(payload)),
                  body: payload,
                };
              }

              return {
                format,
                fileName: `analytics_${dataType}.${format}`,
                contentType:
                  format === 'csv'
                    ? 'text/csv; charset=utf-8'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                buffer: Buffer.from(
                  format === 'csv'
                    ? 'section,totalUsers,totalTransactions\noverview,10,20\n'
                    : 'PK',
                ),
              };
            }),
            requestExportJob: jest.fn(async (userId, dataType, body) => ({
              requestId: 'job-1',
              status: AnalyticsExportStatus.PENDING,
              dataType,
              format: body.format ?? AnalyticsExportFormat.JSON,
              createdAt: new Date(),
            })),
            getExportJobStatus: jest.fn(async () => ({
              requestId: 'job-1',
              status: AnalyticsExportStatus.PENDING,
              dataType: 'all',
              format: AnalyticsExportFormat.JSON,
              createdAt: new Date(),
            })),
            getExportJobDownload: jest.fn(async () => ({
              filePath: '/tmp/analytics-export.json',
              fileName: 'analytics_export.json',
              contentType: 'application/json',
            })),
          },
        },
        {
          provide: getRepositoryToken(UserGrowthMetrics),
          useValue: mockRepositories.UserGrowthMetricsRepository,
        },
        {
          provide: getRepositoryToken(TransactionMetrics),
          useValue: mockRepositories.TransactionMetricsRepository,
        },
        {
          provide: getRepositoryToken(SavingsMetrics),
          useValue: mockRepositories.SavingsMetricsRepository,
        },
        {
          provide: getRepositoryToken(SystemHealthMetrics),
          useValue: mockRepositories.SystemHealthMetricsRepository,
        },
        {
          provide: getRepositoryToken(SystemStatistics),
          useValue: mockRepositories.SystemStatisticsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositories.UserRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepositories.TransactionRepository,
        },
        {
          provide: getRepositoryToken(UserSubscription),
          useValue: mockRepositories.UserSubscriptionRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
            store: { keys: jest.fn() },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    statisticsService = moduleFixture.get<StatisticsService>(StatisticsService);
    cacheManager = moduleFixture.get(CACHE_MANAGER);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Overview Endpoint', () => {
    it('should return statistics overview with all metrics', async () => {
      const mockOverview: StatisticsOverviewDto = {
        userGrowth: {
          totalUsers: 15000,
          activeUsers: 12500,
          newUsersCount: 250,
          inactiveUsers: 2500,
          churnedUsers: 120,
          retentionRate: 95.2,
          churnRate: 4.8,
          growthRate: 2.3,
        },
        transactionVolume: {
          totalTransactions: 5000,
          successfulTransactions: 4800,
          failedTransactions: 150,
          pendingTransactions: 50,
          totalVolume: 1500000,
          avgTransactionAmount: 300,
          minTransactionAmount: 10,
          maxTransactionAmount: 50000,
          successRate: 96.0,
          failureRate: 3.0,
          avgGasUsed: 0.005,
          totalGasSpent: 25,
        },
        savingsMetrics: {
          totalAccounts: 8000,
          activeAccounts: 7500,
          newAccounts: 150,
          closedAccounts: 30,
          totalValueLocked: 5000000,
          inflow: 500000,
          outflow: 100000,
          avgApy: 5.5,
          minApy: 3.0,
          maxApy: 8.0,
          totalInterestEarned: 250000,
          accountGrowthRate: 2.1,
          tvlGrowthRate: 3.5,
        },
        systemHealth: {
          healthScore: 98.5,
          apiUptime: 99.95,
          blockchainUptime: 99.9,
          totalRequests: 1000000,
          successfulRequests: 995000,
          failedRequests: 5000,
          avgResponseTime: 45.2,
          p95ResponseTime: 150.0,
          p99ResponseTime: 250.0,
          memoryUsage: 65.0,
          cpuUsage: 45.0,
          diskUsage: 75.0,
          cacheHitRate: 85.0,
        },
        generatedAt: new Date(),
      };

      jest
        .spyOn(statisticsService, 'getStatisticsOverview')
        .mockResolvedValue(mockOverview);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .set('Authorization', adminToken)
        .query({ range: '30d', period: 'daily' })
        .expect(HttpStatus.OK);

      expect(response.body.userGrowth).toEqual(mockOverview.userGrowth);
      expect(response.body.transactionVolume).toEqual(
        mockOverview.transactionVolume,
      );
      expect(response.body.savingsMetrics).toEqual(mockOverview.savingsMetrics);
      expect(response.body.systemHealth).toEqual(mockOverview.systemHealth);
    });

    it('should support comparison periods', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .set('Authorization', adminToken)
        .query({
          range: '30d',
          compareWith: 'previous_period',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('userGrowth');
      expect(response.body.userGrowth).toHaveProperty('comparison');
    });

    it('should support custom date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .set('Authorization', adminToken)
        .query({
          range: 'custom',
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
    });
  });

  describe('User Growth Endpoint', () => {
    it('should return user growth metrics', async () => {
      const mockUserGrowth: UserGrowthDto = {
        totalUsers: 15000,
        activeUsers: 12500,
        newUsersCount: 250,
        inactiveUsers: 2500,
        churnedUsers: 120,
        retentionRate: 95.2,
        churnRate: 4.8,
        growthRate: 2.3,
        usersByRegion: { US: 5000, EU: 4000, APAC: 3500 },
        usersBySegment: { Premium: 6000, Standard: 9000 },
        timeSeries: [
          {
            timestamp: new Date(),
            value: 250,
            previousValue: 240,
            change: 10,
            changePercentage: 4.17,
          },
        ],
      };

      jest
        .spyOn(statisticsService, 'getUserGrowthStatistics')
        .mockResolvedValue(mockUserGrowth);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/users/growth')
        .set('Authorization', adminToken)
        .expect(HttpStatus.OK);

      expect(response.body.totalUsers).toBe(mockUserGrowth.totalUsers);
      expect(response.body.retentionRate).toBe(mockUserGrowth.retentionRate);
      expect(response.body.usersByRegion).toEqual(mockUserGrowth.usersByRegion);
      expect(Array.isArray(response.body.timeSeries)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/users/growth')
        .set('Authorization', adminToken)
        .query({ page: 2, limit: 50 })
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
    });
  });

  describe('Transaction Volume Endpoint', () => {
    it('should return transaction metrics', async () => {
      const mockTransactions: TransactionVolumeDto = {
        totalTransactions: 5000,
        successfulTransactions: 4800,
        failedTransactions: 150,
        pendingTransactions: 50,
        totalVolume: 1500000,
        avgTransactionAmount: 300,
        minTransactionAmount: 10,
        maxTransactionAmount: 50000,
        successRate: 96.0,
        failureRate: 3.0,
        avgGasUsed: 0.005,
        totalGasSpent: 25,
        transactionsByType: { deposit: 2500, withdrawal: 1500, transfer: 1000 },
        volumeByType: { deposit: 750000, withdrawal: 500000, transfer: 250000 },
        timeSeries: [
          {
            timestamp: new Date(),
            value: 300000,
            previousValue: 280000,
            change: 20000,
            changePercentage: 7.14,
          },
        ],
      };

      jest
        .spyOn(statisticsService, 'getTransactionVolumeStatistics')
        .mockResolvedValue(mockTransactions);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/transactions/volume')
        .set('Authorization', adminToken)
        .expect(HttpStatus.OK);

      expect(response.body.totalTransactions).toBe(
        mockTransactions.totalTransactions,
      );
      expect(response.body.successRate).toBe(mockTransactions.successRate);
      expect(response.body.transactionsByType).toEqual(
        mockTransactions.transactionsByType,
      );
    });

    it('should support drill-down filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/transactions/volume')
        .set('Authorization', adminToken)
        .query({ filter: 'deposit' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('drillDown');
    });
  });

  describe('Savings Metrics Endpoint', () => {
    it('should return savings metrics', async () => {
      const mockSavings: SavingsMetricsDto = {
        totalAccounts: 8000,
        activeAccounts: 7500,
        newAccounts: 150,
        closedAccounts: 30,
        totalValueLocked: 5000000,
        inflow: 500000,
        outflow: 100000,
        avgApy: 5.5,
        minApy: 3.0,
        maxApy: 8.0,
        totalInterestEarned: 250000,
        accountGrowthRate: 2.1,
        tvlGrowthRate: 3.5,
        accountsByProduct: {
          Product_A: 3000,
          Product_B: 2500,
          Product_C: 2500,
        },
        tvlByProduct: {
          Product_A: 2000000,
          Product_B: 1750000,
          Product_C: 1250000,
        },
        apyByProduct: { Product_A: 6.0, Product_B: 5.5, Product_C: 4.5 },
        timeSeries: [
          {
            timestamp: new Date(),
            value: 5000000,
            previousValue: 4800000,
            change: 200000,
            changePercentage: 4.17,
          },
        ],
      };

      jest
        .spyOn(statisticsService, 'getSavingsStatistics')
        .mockResolvedValue(mockSavings);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/savings/metrics')
        .set('Authorization', adminToken)
        .expect(HttpStatus.OK);

      expect(response.body.totalAccounts).toBe(mockSavings.totalAccounts);
      expect(response.body.totalValueLocked).toBe(mockSavings.totalValueLocked);
      expect(response.body.accountsByProduct).toEqual(
        mockSavings.accountsByProduct,
      );
    });
  });

  describe('System Health Endpoint', () => {
    it('should return system health metrics', async () => {
      const mockHealth: SystemHealthDto = {
        healthScore: 98.5,
        apiUptime: 99.95,
        blockchainUptime: 99.9,
        totalRequests: 1000000,
        successfulRequests: 995000,
        failedRequests: 5000,
        avgResponseTime: 45.2,
        p95ResponseTime: 150.0,
        p99ResponseTime: 250.0,
        memoryUsage: 65.0,
        cpuUsage: 45.0,
        diskUsage: 75.0,
        cacheHitRate: 85.0,
        serviceStatus: { api: 'healthy', blockchain: 'healthy' },
        alerts: [
          {
            severity: 'warning',
            message: 'Memory usage above 60%',
            timestamp: new Date(),
          },
        ],
      };

      jest
        .spyOn(statisticsService, 'getSystemHealthStatistics')
        .mockResolvedValue(mockHealth);

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/system/health')
        .set('Authorization', adminToken)
        .expect(HttpStatus.OK);

      expect(response.body.healthScore).toBe(mockHealth.healthScore);
      expect(response.body.apiUptime).toBe(mockHealth.apiUptime);
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      jest.spyOn(statisticsService, 'clearCache').mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/admin/statistics/cache')
        .set('Authorization', adminToken)
        .expect(HttpStatus.NO_CONTENT);

      expect(response.status).toBe(204);
    });

    it('should clear cache with pattern', async () => {
      jest.spyOn(statisticsService, 'clearCache').mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/admin/statistics/cache')
        .set('Authorization', adminToken)
        .query({ pattern: 'user_growth' })
        .expect(HttpStatus.NO_CONTENT);

      expect(response.status).toBe(204);
    });

    it('should reject invalid pattern', async () => {
      const response = await request(app.getHttpServer())
        .delete('/admin/statistics/cache')
        .set('Authorization', adminToken)
        .query({ pattern: 'a'.repeat(101) }) // Pattern too long
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.statusCode).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      const nonAdminToken =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6InVzZXIifQ.signature';

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .set('Authorization', nonAdminToken)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.statusCode).toBe(403);
    });

    it('should handle invalid date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/overview')
        .set('Authorization', adminToken)
        .query({ range: 'invalid' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 when no data found', async () => {
      jest
        .spyOn(statisticsService, 'getUserGrowthStatistics')
        .mockRejectedValue(new Error('No data found'));

      const response = await request(app.getHttpServer())
        .get('/admin/statistics/users/growth')
        .set('Authorization', adminToken)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toBeDefined();
    });
  });

  describe('Data Export', () => {
    it('should export statistics in JSON format', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/export/all')
        .set('Authorization', adminToken)
        .query({ format: 'json' })
        .expect(HttpStatus.OK);

      expect(response.body.dataType).toBe('all');
      expect(response.body.sections).toBeDefined();
    });

    it('should export user statistics in CSV format', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/export/users')
        .set('Authorization', adminToken)
        .query({ format: 'csv' })
        .expect(HttpStatus.OK);

      expect(response.header['content-type']).toContain('text/csv');
      expect(response.text).toContain('section,totalUsers,totalTransactions');
    });

    it('should export analytics in xlsx format', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/export/all')
        .set('Authorization', adminToken)
        .query({ format: 'xlsx' })
        .expect(HttpStatus.OK);

      expect(response.header['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should queue an export job', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/statistics/export/all/jobs')
        .set('Authorization', adminToken)
        .send({ format: 'json', range: '30d' })
        .expect(HttpStatus.ACCEPTED);

      expect(response.body.requestId).toBe('job-1');
      expect(response.body.status).toBe(AnalyticsExportStatus.PENDING);
    });

    it('should support date range filtering on export', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/export/transactions')
        .set('Authorization', adminToken)
        .query({
          format: 'json',
          range: 'custom',
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        })
        .expect(HttpStatus.OK);

      expect(response.body.range).toBe('custom');
      expect(response.body.dataType).toBe('transactions');
    });

    it('should reject invalid format', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/export/all')
        .set('Authorization', adminToken)
        .query({ format: 'pdf' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toContain(
        'Invalid analytics export format',
      );
    });
  });

  describe('Drill-Down', () => {
    it('should get drill-down data for transaction metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/drilldown/transactions/deposit')
        .set('Authorization', adminToken)
        .expect(HttpStatus.OK);

      expect(response.body.category).toBe('deposit');
      expect(response.body).toHaveProperty('breakdown');
    });

    it('should reject invalid metric type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/statistics/drilldown/invalid/category')
        .set('Authorization', adminToken)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Invalid metric type');
    });
  });
});

describe('Statistics Utils Service', () => {
  let service: StatisticsUtilsService;

  beforeAll(() => {
    service = new StatisticsUtilsService();
  });

  describe('Percentage Calculations', () => {
    it('should calculate percentage change', () => {
      expect(service.calculatePercentageChange(100, 120)).toBe(20);
      expect(service.calculatePercentageChange(100, 80)).toBe(-20);
      expect(service.calculatePercentageChange(0, 100)).toBe(100);
    });

    it('should detect trend direction', () => {
      expect(service.getTrendDirection(100, 120)).toBe('up');
      expect(service.getTrendDirection(100, 80)).toBe('down');
      expect(service.getTrendDirection(100, 100.5)).toBe('stable');
    });
  });

  describe('Statistical Functions', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should calculate average', () => {
      expect(service.calculateAverage(values)).toBe(5.5);
    });

    it('should calculate median', () => {
      expect(service.calculateMedian(values)).toBe(5.5);
    });

    it('should calculate standard deviation', () => {
      const stdDev = service.calculateStdDev(values);
      expect(stdDev).toBeGreaterThan(2.8);
      expect(stdDev).toBeLessThan(3.1);
    });

    it('should calculate percentiles', () => {
      const p95 = service.calculatePercentile(values, 95);
      expect(p95).toBeGreaterThan(9);
      expect(p95).toBeLessThanOrEqual(10);
    });
  });

  describe('Formatting Functions', () => {
    it('should format large numbers', () => {
      expect(service.formatNumber(1000)).toBe('1.00K');
      expect(service.formatNumber(1000000)).toBe('1.00M');
      expect(service.formatNumber(1000000000)).toBe('1.00B');
    });

    it('should format duration', () => {
      expect(service.formatDuration(3600000)).toContain('h');
      expect(service.formatDuration(60000)).toContain('m');
    });

    it('should format currency', () => {
      const formatted = service.formatCurrency(1234.56, 'USD', 2);
      expect(formatted).toContain('1,234.56');
    });
  });

  describe('Moving Averages', () => {
    const values = [10, 20, 30, 40, 50];

    it('should calculate SMA', () => {
      const sma = service.calculateSMA(values, 3);
      expect(sma[0]).toBe(20); // (10+20+30)/3
      expect(sma[1]).toBe(30); // (20+30+40)/3
    });

    it('should calculate EMA', () => {
      const ema = service.calculateEMA(values, 3);
      expect(ema.length).toBeGreaterThan(0);
      expect(ema[0]).toBeDefined();
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect outliers', () => {
      const values = [1, 2, 3, 4, 5, 100]; // 100 is an outlier
      const anomalies = service.detectAnomalies(values, 2);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].value).toBe(100);
    });
  });
});
