import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
}

export interface RetryAttempt {
  attempt: number;
  delayMs: number;
  timestamp: Date;
  error?: string;
  success: boolean;
}

@Injectable()
export class ConnectionRetryService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionRetryService.name);
  private readonly retryHistory: RetryAttempt[] = [];
  private readonly maxHistorySize = 500;

  private readonly config: RetryConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.config = {
      maxRetries: this.configService.get<number>(
        'database.retry.maxRetries',
        5,
      ),
      initialDelayMs: this.configService.get<number>(
        'database.retry.initialDelayMs',
        500,
      ),
      maxDelayMs: this.configService.get<number>(
        'database.retry.maxDelayMs',
        30000,
      ),
      backoffMultiplier: this.configService.get<number>(
        'database.retry.backoffMultiplier',
        2.0,
      ),
      jitterMs: this.configService.get<number>('database.retry.jitterMs', 100),
    };
  }

  onModuleInit() {
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('Database connection verified successfully');
    } catch (error) {
      this.logger.warn(
        'Initial DB connection check failed, will retry on demand',
      );
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName = 'db_operation',
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= this.config.maxRetries) {
      try {
        const result = await operation();
        if (attempt > 0) {
          this.recordAttempt(attempt, 0, undefined, true);
          this.logger.log(
            `Operation '${operationName}' succeeded after ${attempt} retries`,
          );
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        this.recordAttempt(attempt + 1, delay, lastError.message, false);

        this.logger.warn(
          `Operation '${operationName}' failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`,
        );

        if (attempt < this.config.maxRetries) {
          await this.sleep(delay);
        }

        attempt++;
      }
    }

    throw (
      lastError ||
      new Error(
        `Operation '${operationName}' failed after ${this.config.maxRetries} retries`,
      )
    );
  }

  async checkAndReconnect(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      this.logger.warn('Connection lost, attempting to reconnect...');
      return this.executeWithRetry(async () => {
        if (!this.dataSource.isInitialized) {
          await this.dataSource.initialize();
        }
        await this.dataSource.query('SELECT 1');
        return true;
      }, 'reconnect').catch(() => false);
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'connection refused',
      'connection terminated',
      'connection timeout',
      'too many connections',
      'remaining connection slots are reserved',
      'econnreset',
      'econnrefused',
      'etimedout',
      'socket hang up',
      'connection lost',
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some((msg) => message.includes(msg));
  }

  private calculateDelay(attempt: number): number {
    const base =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt);
    const jitter = Math.random() * this.config.jitterMs;
    return Math.min(base + jitter, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private recordAttempt(
    attempt: number,
    delayMs: number,
    error: string | undefined,
    success: boolean,
  ): void {
    this.retryHistory.push({
      attempt,
      delayMs,
      timestamp: new Date(),
      error,
      success,
    });
    if (this.retryHistory.length > this.maxHistorySize) {
      this.retryHistory.shift();
    }
  }

  getRetryStats() {
    const total = this.retryHistory.length;
    const failures = this.retryHistory.filter((r) => !r.success);
    const successes = this.retryHistory.filter(
      (r) => r.success && r.attempt > 0,
    );

    return {
      totalAttempts: total,
      retryFailures: failures.length,
      retrySuccesses: successes.length,
      config: this.config,
      recentHistory: this.retryHistory.slice(-20),
    };
  }
}
