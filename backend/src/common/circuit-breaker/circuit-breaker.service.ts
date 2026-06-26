import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreaker,
  CircuitBreakerMetrics,
} from './circuit-breaker.config';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers: Map<string, CircuitBreaker> = new Map();
  private readonly rpcEndpoints: string[];

  constructor(private configService: ConfigService) {
    this.rpcEndpoints = [
      this.configService.get<string>(
        'SOROBAN_RPC_URL',
        'https://soroban-testnet.stellar.org',
      ),
      this.configService.get<string>(
        'SOROBAN_RPC_FALLBACK_URL',
        'https://soroban-testnet.stellar.org',
      ),
    ].filter((url) => url);

    this.initializeBreakers();
  }

  private initializeBreakers() {
    this.rpcEndpoints.forEach((endpoint) => {
      const name = `RPC-${new URL(endpoint).hostname}`;
      this.breakers.set(name, new CircuitBreaker(this.configService, name));
    });
  }

  async executeWithFallback<T>(
    fn: (endpoint: string) => Promise<T>,
  ): Promise<T> {
    const errors: Error[] = [];

    for (const endpoint of this.rpcEndpoints) {
      const breakerName = `RPC-${new URL(endpoint).hostname}`;
      const breaker = this.breakers.get(breakerName);

      if (!breaker) continue;

      try {
        return await breaker.execute(() => fn(endpoint));
      } catch (error) {
        errors.push(error as Error);
        this.logger.warn(
          `Endpoint ${endpoint} failed, trying next endpoint`,
          error,
        );
      }
    }

    this.logger.error('All RPC endpoints exhausted', errors);
    throw new Error(
      'All RPC endpoints are unavailable. Graceful degradation: returning cached data or default values.',
    );
  }

  getMetrics(
    breakerName?: string,
  ): CircuitBreakerMetrics | Map<string, CircuitBreakerMetrics> | null {
    if (breakerName) {
      const breaker = this.breakers.get(breakerName);
      return breaker ? breaker.getMetrics() : null;
    }

    const metrics = new Map<string, CircuitBreakerMetrics>();
    this.breakers.forEach((breaker, name) => {
      metrics.set(name, breaker.getMetrics());
    });
    return metrics;
  }

  manualOpen(breakerName: string) {
    const breaker = this.breakers.get(breakerName);
    if (breaker) {
      breaker.manualOpen();
    }
  }

  manualClose(breakerName: string) {
    const breaker = this.breakers.get(breakerName);
    if (breaker) {
      breaker.manualClose();
    }
  }

  getAllBreakers(): string[] {
    return Array.from(this.breakers.keys());
  }
}
