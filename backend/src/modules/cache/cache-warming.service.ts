import { Injectable, Logger } from '@nestjs/common';
import { CacheStrategyService } from './cache-strategy.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface CacheableEndpoint {
  key: string;
  priority: CachePriority;
  loader: () => Promise<any>;
  ttl?: number;
}

@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private cacheableEndpoints: CacheableEndpoint[] = [];
  private warmingMetrics = {
    totalWarmed: 0,
    successCount: 0,
    failureCount: 0,
    lastWarmedAt: null as Date | null,
    warmingDuration: 0,
  };

  constructor(private readonly cacheStrategy: CacheStrategyService) {}

  registerCacheableEndpoint(endpoint: CacheableEndpoint): void {
    this.cacheableEndpoints.push(endpoint);
    this.logger.log(`Registered cacheable endpoint: ${endpoint.key}`);
  }

  async warmAllEndpoints(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting cache warming...');

    try {
      const sortedEndpoints = [...this.cacheableEndpoints].sort(
        (a, b) => b.priority - a.priority,
      );

      for (const endpoint of sortedEndpoints) {
        await this.warmEndpoint(endpoint);
      }

      const duration = Date.now() - startTime;
      this.warmingMetrics.warmingDuration = duration;
      this.warmingMetrics.lastWarmedAt = new Date();
      this.warmingMetrics.totalWarmed += sortedEndpoints.length;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  async warmEndpoint(endpoint: CacheableEndpoint): Promise<void> {
    try {
      await this.cacheStrategy.warmCache(
        endpoint.key,
        endpoint.loader,
        endpoint.ttl,
      );
      this.warmingMetrics.successCount++;
    } catch (error) {
      this.warmingMetrics.failureCount++;
      this.logger.error(`Failed to warm endpoint ${endpoint.key}:`, error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  handleScheduledWarmup(): void {
    this.warmAllEndpoints();
  }

  getWarmingMetrics() {
    return {
      ...this.warmingMetrics,
      successRate: this.warmingMetrics.totalWarmed > 0
        ? ((this.warmingMetrics.successCount / this.warmingMetrics.totalWarmed) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  getRegisteredEndpoints(): CacheableEndpoint[] {
    return this.cacheableEndpoints;
  }
}
