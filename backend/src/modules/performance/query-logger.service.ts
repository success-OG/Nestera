import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
  executionPlan?: string;
}

@Injectable()
export class QueryLoggerService {
  private readonly logger = new Logger(QueryLoggerService.name);
  private readonly slowQueryThreshold = 100; // ms
  private slowQueries: QueryMetrics[] = [];
  private readonly maxStoredQueries = 1000;

  constructor(private dataSource: DataSource) {
    this.setupQueryLogging();
  }

  private setupQueryLogging() {
    const queryRunner = this.dataSource.createQueryRunner();

    this.dataSource.subscribers?.forEach((subscriber) => {
      if (subscriber.beforeQuery) {
        const originalBeforeQuery = subscriber.beforeQuery.bind(subscriber);
        subscriber.beforeQuery = (event) => {
          (event as any).startTime = Date.now();
          return originalBeforeQuery(event);
        };
      }

      if (subscriber.afterQuery) {
        const originalAfterQuery = subscriber.afterQuery.bind(subscriber);
        subscriber.afterQuery = (event) => {
          const duration =
            Date.now() - ((event as any).startTime || Date.now());

          if (duration > this.slowQueryThreshold) {
            this.recordSlowQuery({
              query: event.query,
              duration,
              timestamp: new Date(),
              params: event.parameters,
            });
          }

          return originalAfterQuery(event);
        };
      }
    });
  }

  private recordSlowQuery(metrics: QueryMetrics) {
    this.slowQueries.push(metrics);

    if (this.slowQueries.length > this.maxStoredQueries) {
      this.slowQueries.shift();
    }

    this.logger.warn(
      `Slow query detected (${metrics.duration}ms): ${metrics.query}`,
      { duration: metrics.duration, params: metrics.params },
    );
  }

  getSlowQueries(limit: number = 50): QueryMetrics[] {
    return this.slowQueries.slice(-limit);
  }

  getQueryStats() {
    const stats = {
      totalSlowQueries: this.slowQueries.length,
      averageDuration:
        this.slowQueries.length > 0
          ? this.slowQueries.reduce((sum, q) => sum + q.duration, 0) /
            this.slowQueries.length
          : 0,
      maxDuration:
        this.slowQueries.length > 0
          ? Math.max(...this.slowQueries.map((q) => q.duration))
          : 0,
      minDuration:
        this.slowQueries.length > 0
          ? Math.min(...this.slowQueries.map((q) => q.duration))
          : 0,
    };
    return stats;
  }

  async analyzeExecutionPlan(query: string): Promise<string> {
    try {
      const result = await this.dataSource.query(`EXPLAIN ${query}`);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      this.logger.error('Failed to analyze execution plan', error);
      return '';
    }
  }

  detectNPlusOne(): { detected: boolean; patterns: string[] } {
    const patterns: string[] = [];
    const queryMap = new Map<string, number>();

    this.slowQueries.forEach((q) => {
      const normalized = q.query.replace(/\?/g, '?').toLowerCase();
      queryMap.set(normalized, (queryMap.get(normalized) || 0) + 1);
    });

    queryMap.forEach((count, query) => {
      if (count > 5) {
        patterns.push(
          `Query executed ${count} times: ${query.substring(0, 100)}`,
        );
      }
    });

    return {
      detected: patterns.length > 0,
      patterns,
    };
  }

  suggestIndexes(): string[] {
    const suggestions: string[] = [];
    const frequentQueries = this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    frequentQueries.forEach((q) => {
      if (q.query.includes('WHERE') && !q.query.includes('INDEX')) {
        const match = q.query.match(/WHERE\s+(\w+)\s*=/);
        if (match) {
          suggestions.push(`Consider adding index on column: ${match[1]}`);
        }
      }
    });

    return suggestions;
  }

  clearMetrics() {
    this.slowQueries = [];
  }
}
