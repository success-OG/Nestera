import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import {
  DistributedTracingService,
  TraceContext,
} from './distributed-tracing.service';

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  type: string;
  route?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  traceId?: string;
  timestamp: Date;
  count: number;
}

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  windowMinutes: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

@Injectable()
export class ApmService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApmService.name);
  private readonly errorRegistry = new Map<string, ErrorEvent>();
  private readonly alertRules: AlertRule[] = [];
  private readonly alertHistory: Array<{
    rule: string;
    value: number;
    timestamp: Date;
    severity: string;
  }> = [];
  private alertEvaluationTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly tracingService: DistributedTracingService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.setupDefaultAlertRules();
    this.startAlertEvaluationLoop();
  }

  onModuleDestroy(): void {
    if (this.alertEvaluationTimer) {
      clearInterval(this.alertEvaluationTimer);
      this.alertEvaluationTimer = null;
    }
  }

  private setupDefaultAlertRules() {
    this.alertRules.push(
      {
        name: 'high_error_rate',
        metric: 'errors_total',
        condition: 'gt',
        threshold: 50,
        windowMinutes: 5,
        severity: 'critical',
        enabled: true,
      },
      {
        name: 'slow_response_time',
        metric: 'http_request_duration_seconds',
        condition: 'gt',
        threshold: 2.0,
        windowMinutes: 5,
        severity: 'warning',
        enabled: true,
      },
      {
        name: 'high_db_pool_usage',
        metric: 'db_pool_active_connections',
        condition: 'gt',
        threshold: parseInt(
          this.configService.get<string>('DATABASE_POOL_ALERT_THRESHOLD') ||
            String(
              Math.floor(
                (this.configService.get<number>('database.pool.max', 30) ||
                  30) * 0.8,
              ),
            ),
          10,
        ),
        windowMinutes: 1,
        severity: 'warning',
        enabled: true,
      },
      {
        name: 'pool_exhaustion',
        metric: 'db_pool_waiting_connections',
        condition: 'gt',
        threshold: this.configService.get<number>(
          'database.pool.exhaustionWaitingThreshold',
          0,
        ),
        windowMinutes: 1,
        severity: 'critical',
        enabled: true,
      },
      {
        name: 'high_pool_utilization',
        metric: 'db_pool_utilization_percent',
        condition: 'gt',
        threshold: this.configService.get<number>(
          'database.pool.scaleUpThreshold',
          80,
        ),
        windowMinutes: 1,
        severity: 'warning',
        enabled: true,
      },
    );
  }

  private startAlertEvaluationLoop() {
    this.alertEvaluationTimer = setInterval(() => {
      this.evaluateAlerts();
    }, 60_000);
  }

  private evaluateAlerts() {
    const summary = this.metricsService.getMetricsSummary();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const metricData = summary[rule.metric] as
        | { values: Record<string, number> }
        | undefined;
      if (!metricData) continue;

      const values = Object.values(metricData.values || {});
      if (values.length === 0) continue;

      const total = values.reduce((a, b) => a + b, 0);
      let triggered = false;

      if (rule.condition === 'gt' && total > rule.threshold) triggered = true;
      if (rule.condition === 'lt' && total < rule.threshold) triggered = true;
      if (rule.condition === 'eq' && total === rule.threshold) triggered = true;

      if (triggered) {
        this.triggerAlert(rule, total);
      }
    }
  }

  private triggerAlert(rule: AlertRule, value: number) {
    const entry = {
      rule: rule.name,
      value,
      timestamp: new Date(),
      severity: rule.severity,
    };

    this.alertHistory.push(entry);
    if (this.alertHistory.length > 1000) this.alertHistory.shift();

    this.logger.warn(
      `[ALERT][${rule.severity.toUpperCase()}] ${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      entry,
    );
  }

  trackError(
    error: Error,
    context: {
      route?: string;
      method?: string;
      statusCode?: number;
      userId?: string;
      traceId?: string;
    },
  ): void {
    const key = `${error.constructor.name}:${error.message}`;
    const existing = this.errorRegistry.get(key);

    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      this.errorRegistry.set(key, {
        id: key,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
        route: context.route,
        method: context.method,
        statusCode: context.statusCode,
        userId: context.userId,
        traceId: context.traceId,
        timestamp: new Date(),
        count: 1,
      });
    }

    this.metricsService.incrementCounter('errors_total', {
      type: error.constructor.name,
      route: context.route || 'unknown',
      status_code: String(context.statusCode || 500),
    });
  }

  trackHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.metricsService.incrementCounter('http_requests_total', labels);
    this.metricsService.recordHistogram(
      'http_request_duration_seconds',
      durationMs / 1000,
      labels,
    );
  }

  trackUserRegistration(method: 'email' | 'oauth' | 'wallet'): void {
    this.metricsService.incrementCounter('user_registrations_total', {
      method,
    });
  }

  trackUserLogin(status: 'success' | 'failure' | '2fa_required'): void {
    this.metricsService.incrementCounter('user_logins_total', { status });
  }

  trackSavingsSubscription(
    productType: string,
    status: 'created' | 'activated' | 'cancelled',
  ): void {
    this.metricsService.incrementCounter('savings_subscriptions_total', {
      product_type: productType,
      status,
    });
  }

  trackTransaction(
    type: string,
    status: 'pending' | 'completed' | 'failed',
    amountUsdc?: number,
  ): void {
    this.metricsService.incrementCounter('transactions_total', {
      type,
      status,
    });
    if (amountUsdc !== undefined) {
      this.metricsService.recordHistogram(
        'transaction_amount_usdc',
        amountUsdc,
        { type },
      );
    }
  }

  trackDbQuery(operation: string, entity: string, durationMs: number): void {
    this.metricsService.recordHistogram(
      'db_query_duration_seconds',
      durationMs / 1000,
      {
        operation,
        entity,
      },
    );
  }

  updateDbPoolMetrics(
    active: number,
    idle: number,
    waiting = 0,
    utilizationPercent = 0,
    maxSize = 0,
  ): void {
    this.metricsService.setGauge('db_pool_active_connections', active);
    this.metricsService.setGauge('db_pool_idle_connections', idle);
    this.metricsService.setGauge('db_pool_waiting_connections', waiting);
    this.metricsService.setGauge(
      'db_pool_utilization_percent',
      utilizationPercent,
    );
    this.metricsService.setGauge('db_pool_max_size', maxSize);
  }

  recordPoolAlert(
    alertType: string,
    value: number,
    severity: 'info' | 'warning' | 'critical',
  ): void {
    this.metricsService.incrementCounter('db_pool_alerts_total', {
      alert_type: alertType,
      severity,
    });

    const entry = {
      rule: alertType,
      value,
      timestamp: new Date(),
      severity,
    };

    this.alertHistory.push(entry);
    if (this.alertHistory.length > 1000) this.alertHistory.shift();

    const logMethod =
      severity === 'critical'
        ? this.logger.error.bind(this.logger)
        : severity === 'warning'
          ? this.logger.warn.bind(this.logger)
          : this.logger.log.bind(this.logger);

    logMethod(
      `[POOL ALERT][${severity.toUpperCase()}] ${alertType}: value=${value}`,
      entry,
    );
  }

  trackTokenRefresh(status: 'success' | 'failure'): void {
    this.metricsService.incrementCounter('auth_token_refresh_total', {
      status,
    });
  }

  trackKycVerification(status: 'approved' | 'rejected' | 'pending'): void {
    this.metricsService.incrementCounter('kyc_verifications_total', { status });
  }

  getErrorSummary(): ErrorEvent[] {
    return Array.from(this.errorRegistry.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
  }

  getTopErrors(limit = 10): ErrorEvent[] {
    return Array.from(this.errorRegistry.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getAlertHistory(limit = 50): typeof this.alertHistory {
    return this.alertHistory.slice(-limit);
  }

  getAlertRules(): AlertRule[] {
    return this.alertRules;
  }

  getDashboardData() {
    return {
      metrics: this.metricsService.getMetricsSummary(),
      errors: {
        total: Array.from(this.errorRegistry.values()).reduce(
          (a, e) => a + e.count,
          0,
        ),
        uniqueTypes: this.errorRegistry.size,
        top: this.getTopErrors(),
      },
      tracing: this.tracingService.getTracingStats(),
      alerts: {
        rules: this.alertRules.filter((r) => r.enabled).length,
        recentFired: this.alertHistory.slice(-10),
      },
    };
  }
}
