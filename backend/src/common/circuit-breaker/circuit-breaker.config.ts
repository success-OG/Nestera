import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  failureRate: number;
}

@Injectable()
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private openedAt?: Date;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly halfOpenRequests: number;
  private halfOpenAttempts = 0;

  constructor(
    private configService: ConfigService,
    private name: string,
  ) {
    this.failureThreshold = configService.get<number>(
      'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
      5,
    );
    this.successThreshold = configService.get<number>(
      'CIRCUIT_BREAKER_SUCCESS_THRESHOLD',
      2,
    );
    this.timeout = configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000);
    this.halfOpenRequests = configService.get<number>(
      'CIRCUIT_BREAKER_HALF_OPEN_REQUESTS',
      3,
    );
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        this.logger.warn(
          `[${this.name}] Circuit breaker transitioning to HALF_OPEN`,
        );
      } else {
        throw new Error(
          `[${this.name}] Circuit breaker is OPEN. Service unavailable.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.successCount++;
    this.totalRequests++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.successThreshold) {
        this.reset();
        this.logger.log(
          `[${this.name}] Circuit breaker CLOSED after successful recovery`,
        );
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.totalRequests++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.trip();
      this.logger.error(
        `[${this.name}] Circuit breaker OPEN after failure in HALF_OPEN state`,
      );
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      this.trip();
      this.logger.error(
        `[${this.name}] Circuit breaker OPEN after ${this.failureCount} failures`,
      );
    }
  }

  private trip() {
    this.state = CircuitBreakerState.OPEN;
    this.openedAt = new Date();
  }

  private reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = undefined;
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    const elapsed = Date.now() - this.openedAt.getTime();
    return elapsed >= this.timeout;
  }

  getMetrics(): CircuitBreakerMetrics {
    const failureRate =
      this.totalRequests > 0
        ? (this.failureCount / this.totalRequests) * 100
        : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      failureRate,
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  manualOpen() {
    this.trip();
    this.logger.warn(`[${this.name}] Circuit breaker manually opened`);
  }

  manualClose() {
    this.reset();
    this.logger.log(`[${this.name}] Circuit breaker manually closed`);
  }
}
