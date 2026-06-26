import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ApmService } from '../../modules/apm/apm.service';

export interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  maxPoolSize: number;
  utilizationPercentage: number;
  timestamp: Date;
}

interface PgPool {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  options: { max: number; min: number };
}

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private metrics: PoolMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private monitorInterval: NodeJS.Timeout | null = null;
  private highUtilizationStreak = 0;
  private lowUtilizationStreak = 0;
  private lastExhaustionAlertAt = 0;
  private lastLeakAlertAt = 0;
  private readonly alertCooldownMs = 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly apmService: ApmService,
  ) {}

  onModuleInit(): void {
    this.initializePoolMonitoring();
  }

  private initializePoolMonitoring(): void {
    const intervalMs = this.configService.get<number>(
      'database.pool.monitorIntervalMs',
      30000,
    );

    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private getPool(): PgPool | null {
    const pool = (this.dataSource.driver as { pool?: PgPool }).pool;
    return pool ?? null;
  }

  private collectMetrics(): void {
    try {
      const pool = this.getPool();
      if (!pool) return;

      const activeConnections = pool.totalCount - pool.idleCount;
      const maxPoolSize = pool.options.max;
      const metrics: PoolMetrics = {
        activeConnections,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
        totalConnections: pool.totalCount,
        maxPoolSize,
        utilizationPercentage:
          maxPoolSize > 0 ? (activeConnections / maxPoolSize) * 100 : 0,
        timestamp: new Date(),
      };

      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }

      this.apmService.updateDbPoolMetrics(
        metrics.activeConnections,
        metrics.idleConnections,
        metrics.waitingRequests,
        metrics.utilizationPercentage,
        metrics.maxPoolSize,
      );

      this.checkUtilizationAlerts(metrics);
      this.checkPoolExhaustion(metrics);
      this.detectConnectionLeaksFromMetrics(metrics);

      if (this.configService.get<boolean>('database.pool.autoScale', true)) {
        this.autoScalePool(metrics);
      }
    } catch (error) {
      this.logger.error('Failed to collect pool metrics', error);
    }
  }

  private checkUtilizationAlerts(metrics: PoolMetrics): void {
    const utilizationThreshold = this.configService.get<number>(
      'database.pool.scaleUpThreshold',
      80,
    );

    if (metrics.utilizationPercentage > utilizationThreshold) {
      this.logger.warn(
        `High connection pool utilization: ${metrics.utilizationPercentage.toFixed(2)}% (${metrics.activeConnections}/${metrics.maxPoolSize})`,
      );
      this.apmService.recordPoolAlert(
        'high_pool_utilization',
        metrics.utilizationPercentage,
        'warning',
      );
    }

    const waitingThreshold = this.configService.get<number>(
      'database.pool.exhaustionWaitingThreshold',
      5,
    );

    if (metrics.waitingRequests > waitingThreshold) {
      this.logger.warn(
        `Connection pool queue building up: ${metrics.waitingRequests} waiting requests`,
      );
    }
  }

  private checkPoolExhaustion(metrics: PoolMetrics): void {
    const isExhausted =
      metrics.waitingRequests > 0 &&
      metrics.activeConnections >= metrics.maxPoolSize;

    if (!isExhausted) return;

    const now = Date.now();
    if (now - this.lastExhaustionAlertAt < this.alertCooldownMs) return;

    this.lastExhaustionAlertAt = now;
    this.logger.error(
      `Connection pool exhausted: ${metrics.waitingRequests} requests waiting, ${metrics.activeConnections}/${metrics.maxPoolSize} connections in use`,
    );
    this.apmService.recordPoolAlert(
      'pool_exhaustion',
      metrics.waitingRequests,
      'critical',
    );
  }

  private detectConnectionLeaksFromMetrics(metrics: PoolMetrics): void {
    const leakThreshold = this.configService.get<number>(
      'database.pool.leakDetectionThreshold',
      90,
    );

    const utilizationAtMax =
      metrics.utilizationPercentage >= leakThreshold &&
      metrics.waitingRequests > 0;

    if (!utilizationAtMax) return;

    const now = Date.now();
    if (now - this.lastLeakAlertAt < this.alertCooldownMs) return;

    this.lastLeakAlertAt = now;
    this.logger.warn(
      `Potential connection leak detected: ${metrics.activeConnections}/${metrics.maxPoolSize} active with ${metrics.waitingRequests} waiting`,
    );
    this.apmService.recordPoolAlert(
      'connection_leak_suspected',
      metrics.activeConnections,
      'warning',
    );
  }

  private autoScalePool(metrics: PoolMetrics): void {
    const pool = this.getPool();
    if (!pool) return;

    const scaleUpThreshold = this.configService.get<number>(
      'database.pool.scaleUpThreshold',
      80,
    );
    const scaleDownThreshold = this.configService.get<number>(
      'database.pool.scaleDownThreshold',
      30,
    );
    const maxCeiling = this.configService.get<number>(
      'database.pool.maxCeiling',
      50,
    );
    const configuredMin = this.configService.get<number>(
      'database.pool.min',
      2,
    );
    const scaleStep = Math.max(2, Math.floor(pool.options.max * 0.2));

    if (metrics.utilizationPercentage >= scaleUpThreshold) {
      this.highUtilizationStreak++;
      this.lowUtilizationStreak = 0;

      if (
        this.highUtilizationStreak >= 2 &&
        pool.options.max < maxCeiling &&
        metrics.waitingRequests > 0
      ) {
        const newMax = Math.min(pool.options.max + scaleStep, maxCeiling);
        pool.options.max = newMax;
        this.highUtilizationStreak = 0;
        this.logger.log(
          `Auto-scaled connection pool up: max ${newMax} (utilization ${metrics.utilizationPercentage.toFixed(1)}%)`,
        );
        this.apmService.recordPoolAlert('pool_scaled_up', newMax, 'info');
      }
      return;
    }

    if (metrics.utilizationPercentage <= scaleDownThreshold) {
      this.lowUtilizationStreak++;
      this.highUtilizationStreak = 0;

      const configuredMax = this.configService.get<number>(
        'database.pool.max',
        pool.options.max,
      );

      if (this.lowUtilizationStreak >= 4 && pool.options.max > configuredMax) {
        const newMax = Math.max(configuredMax, pool.options.max - scaleStep);
        pool.options.max = newMax;
        pool.options.min = Math.min(pool.options.min, newMax, configuredMin);
        this.lowUtilizationStreak = 0;
        this.logger.log(
          `Auto-scaled connection pool down: max ${newMax} (utilization ${metrics.utilizationPercentage.toFixed(1)}%)`,
        );
        this.apmService.recordPoolAlert('pool_scaled_down', newMax, 'info');
      }
      return;
    }

    this.highUtilizationStreak = 0;
    this.lowUtilizationStreak = 0;
  }

  getMetrics(): PoolMetrics[] {
    return this.metrics;
  }

  getLatestMetrics(): PoolMetrics | null {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  getAverageUtilization(minutes: number = 5): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) return 0;

    const sum = recentMetrics.reduce(
      (acc, m) => acc + m.utilizationPercentage,
      0,
    );
    return sum / recentMetrics.length;
  }

  async checkPoolHealth(): Promise<boolean> {
    try {
      const result = await this.dataSource.query('SELECT 1');
      return !!result;
    } catch (error) {
      this.logger.error('Pool health check failed', error);
      return false;
    }
  }

  async detectConnectionLeaks(): Promise<number> {
    const metrics = this.getLatestMetrics();
    if (!metrics) return 0;

    const leakThreshold = this.configService.get<number>(
      'database.pool.leakDetectionThreshold',
      90,
    );
    const maxPoolSize = metrics.maxPoolSize;

    if (
      metrics.utilizationPercentage >= leakThreshold &&
      metrics.waitingRequests > 0
    ) {
      this.logger.warn(
        `Potential connection leak detected: ${metrics.activeConnections}/${maxPoolSize}`,
      );
      return metrics.activeConnections;
    }

    return 0;
  }

  getPoolSummary() {
    const pool = this.getPool();
    return {
      averageUtilization: this.getAverageUtilization(),
      latestMetrics: this.getLatestMetrics(),
      totalCollected: this.metrics.length,
      currentMaxPoolSize: pool?.options.max ?? null,
      autoScaleEnabled: this.configService.get<boolean>(
        'database.pool.autoScale',
        true,
      ),
    };
  }

  async getHealthStatus() {
    const isHealthy = await this.checkPoolHealth();
    const metrics = this.getLatestMetrics();
    const leaks = await this.detectConnectionLeaks();

    return {
      status: isHealthy && leaks === 0 ? 'healthy' : 'degraded',
      isConnected: isHealthy,
      leaksDetected: leaks > 0,
      metrics,
      timestamp: new Date(),
    };
  }
}
