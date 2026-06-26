import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricLabels {
  [key: string]: string | number;
}

export interface CounterMetric {
  name: string;
  help: string;
  labels: string[];
}

export interface HistogramMetric {
  name: string;
  help: string;
  labels: string[];
  buckets: number[];
}

export interface GaugeMetric {
  name: string;
  help: string;
  labels: string[];
}

interface StoredMetric {
  type: 'counter' | 'histogram' | 'gauge';
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number | number[]>;
  buckets?: number[];
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics = new Map<string, StoredMetric>();
  private readonly defaultBuckets = [
    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
  ];

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.registerDefaultMetrics();
  }

  private registerDefaultMetrics() {
    // HTTP request metrics
    this.registerCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labels: ['method', 'route', 'status_code'],
    });

    this.registerHistogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labels: ['method', 'route', 'status_code'],
      buckets: this.defaultBuckets,
    });

    // Business metrics
    this.registerCounter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labels: ['method'],
    });

    this.registerCounter({
      name: 'user_logins_total',
      help: 'Total number of login attempts',
      labels: ['status'],
    });

    this.registerCounter({
      name: 'savings_subscriptions_total',
      help: 'Total savings product subscriptions',
      labels: ['product_type', 'status'],
    });

    this.registerCounter({
      name: 'transactions_total',
      help: 'Total number of transactions processed',
      labels: ['type', 'status'],
    });

    this.registerHistogram({
      name: 'transaction_amount_usdc',
      help: 'Transaction amounts in USDC',
      labels: ['type'],
      buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000],
    });

    // Error metrics
    this.registerCounter({
      name: 'errors_total',
      help: 'Total number of errors',
      labels: ['type', 'route', 'status_code'],
    });

    // Database metrics
    this.registerHistogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labels: ['operation', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    this.registerGauge({
      name: 'db_pool_active_connections',
      help: 'Number of active database connections',
      labels: [],
    });

    this.registerGauge({
      name: 'db_pool_idle_connections',
      help: 'Number of idle database connections',
      labels: [],
    });

    this.registerGauge({
      name: 'db_pool_waiting_connections',
      help: 'Number of requests waiting for a database connection',
      labels: [],
    });

    this.registerGauge({
      name: 'db_pool_utilization_percent',
      help: 'Database connection pool utilization percentage',
      labels: [],
    });

    this.registerGauge({
      name: 'db_pool_max_size',
      help: 'Configured maximum database pool size',
      labels: [],
    });

    this.registerCounter({
      name: 'db_pool_alerts_total',
      help: 'Total number of database pool alerts fired',
      labels: ['alert_type', 'severity'],
    });

    // Auth metrics
    this.registerCounter({
      name: 'auth_token_refresh_total',
      help: 'Total number of token refresh operations',
      labels: ['status'],
    });

    this.registerCounter({
      name: 'kyc_verifications_total',
      help: 'Total number of KYC verification attempts',
      labels: ['status'],
    });
  }

  registerCounter(metric: CounterMetric): void {
    this.metrics.set(metric.name, {
      type: 'counter',
      name: metric.name,
      help: metric.help,
      labels: metric.labels,
      values: new Map(),
    });
  }

  registerHistogram(metric: HistogramMetric): void {
    this.metrics.set(metric.name, {
      type: 'histogram',
      name: metric.name,
      help: metric.help,
      labels: metric.labels,
      values: new Map(),
      buckets: metric.buckets,
    });
  }

  registerGauge(metric: GaugeMetric): void {
    this.metrics.set(metric.name, {
      type: 'gauge',
      name: metric.name,
      help: metric.help,
      labels: metric.labels,
      values: new Map(),
    });
  }

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') return;

    const key = this.buildKey(labels);
    const current = (metric.values.get(key) as number) || 0;
    metric.values.set(key, current + value);
  }

  recordHistogram(
    name: string,
    value: number,
    labels: MetricLabels = {},
  ): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return;

    const key = this.buildKey(labels);
    const existing = (metric.values.get(key) as number[]) || [];
    existing.push(value);
    metric.values.set(key, existing);
  }

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') return;

    const key = this.buildKey(labels);
    metric.values.set(key, value);
  }

  private buildKey(labels: MetricLabels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  getMetricsAsPrometheusText(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        for (const [labels, value] of metric.values) {
          const labelStr = labels ? `{${labels}}` : '';
          lines.push(`${metric.name}${labelStr} ${String(value)}`);
        }
      } else if (metric.type === 'histogram') {
        for (const [labels, values] of metric.values) {
          const nums = values as number[];
          const labelStr = labels ? `{${labels}}` : '';
          const buckets = metric.buckets || this.defaultBuckets;

          for (const bucket of buckets) {
            const count = nums.filter((v) => v <= bucket).length;
            const bucketLabel = labels
              ? `{${labels},le="${bucket}"}`
              : `{le="${bucket}"}`;
            lines.push(`${metric.name}_bucket${bucketLabel} ${count}`);
          }

          const infLabel = labels ? `{${labels},le="+Inf"}` : `{le="+Inf"}`;
          lines.push(`${metric.name}_bucket${infLabel} ${nums.length}`);

          const sum = nums.reduce((a, b) => a + b, 0);
          lines.push(`${metric.name}_sum${labelStr} ${sum}`);
          lines.push(`${metric.name}_count${labelStr} ${nums.length}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  getMetricsSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    for (const metric of this.metrics.values()) {
      if (metric.type === 'counter' || metric.type === 'gauge') {
        const values: Record<string, number> = {};
        for (const [labels, value] of metric.values) {
          values[labels || 'total'] = value as number;
        }
        summary[metric.name] = { type: metric.type, values };
      } else if (metric.type === 'histogram') {
        const values: Record<string, unknown> = {};
        for (const [labels, nums] of metric.values) {
          const arr = nums as number[];
          if (arr.length === 0) continue;
          const sorted = [...arr].sort((a, b) => a - b);
          values[labels || 'default'] = {
            count: arr.length,
            sum: arr.reduce((a, b) => a + b, 0),
            avg: arr.reduce((a, b) => a + b, 0) / arr.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            min: sorted[0],
            max: sorted[sorted.length - 1],
          };
        }
        summary[metric.name] = { type: metric.type, values };
      }
    }

    return summary;
  }
}
