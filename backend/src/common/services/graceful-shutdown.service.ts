import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Optional } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Cache } from 'cache-manager';

export type BackgroundWorker = {
  name: string;
  shutdown: () => Promise<void>;
};

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;
  private activeRequests = 0;
  private readonly maxDrainTimeout = 25000;
  private readonly backgroundWorkers: BackgroundWorker[] = [];

  constructor(
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional() private schedulerRegistry?: SchedulerRegistry,
  ) {}

  registerWorker(worker: BackgroundWorker): void {
    this.backgroundWorkers.push(worker);
    this.logger.log(`Registered background worker: ${worker.name}`);
  }

  incrementActiveRequests(): void {
    if (!this.isShuttingDown) {
      this.activeRequests++;
    }
  }

  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Received shutdown signal: ${signal}`);
    this.isShuttingDown = true;

    const shutdownStartTime = Date.now();

    this.logger.log('Stopping acceptance of new requests');

    await this.stopScheduledJobs();

    await this.waitForInFlightRequests();

    await this.stopBackgroundWorkers();

    await this.closeDatabase();

    await this.closeRedis();

    const shutdownDuration = Date.now() - shutdownStartTime;
    this.logger.log(`Graceful shutdown completed in ${shutdownDuration}ms`);
  }

  private async stopScheduledJobs(): Promise<void> {
    if (!this.schedulerRegistry) return;

    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      cronJobs.forEach((job, name) => {
        job.stop();
        this.logger.log(`Stopped cron job: ${name}`);
      });

      const intervals = this.schedulerRegistry.getIntervals();
      intervals.forEach((name) => {
        this.schedulerRegistry!.deleteInterval(name);
        this.logger.log(`Cleared interval: ${name}`);
      });

      const timeouts = this.schedulerRegistry.getTimeouts();
      timeouts.forEach((name) => {
        this.schedulerRegistry!.deleteTimeout(name);
        this.logger.log(`Cleared timeout: ${name}`);
      });
    } catch (error) {
      this.logger.error('Error stopping scheduled jobs:', error);
    }
  }

  private async waitForInFlightRequests(): Promise<void> {
    const startTime = Date.now();

    while (this.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxDrainTimeout) {
        this.logger.warn(
          `Timeout waiting for ${this.activeRequests} in-flight requests. Forcing shutdown.`,
        );
        break;
      }

      this.logger.log(
        `Waiting for ${this.activeRequests} in-flight requests to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (this.activeRequests === 0) {
      this.logger.log('All in-flight requests completed');
    }
  }

  private async stopBackgroundWorkers(): Promise<void> {
    if (this.backgroundWorkers.length === 0) return;

    this.logger.log(
      `Stopping ${this.backgroundWorkers.length} background worker(s)...`,
    );

    const results = await Promise.allSettled(
      this.backgroundWorkers.map(async (worker) => {
        try {
          await worker.shutdown();
          this.logger.log(`Background worker stopped: ${worker.name}`);
        } catch (error) {
          this.logger.error(
            `Error stopping background worker ${worker.name}:`,
            error,
          );
          throw error;
        }
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `${failed.length} background worker(s) failed to stop cleanly`,
      );
    }
  }

  private async closeDatabase(): Promise<void> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        this.logger.log('Closing database connections...');
        await this.dataSource.destroy();
        this.logger.log('Database connections closed');
      }
    } catch (error) {
      this.logger.error('Error closing database connections:', error);
    }
  }

  private async closeRedis(): Promise<void> {
    try {
      if (this.cacheManager) {
        this.logger.log('Closing Redis connections...');
        await this.cacheManager.reset();
        this.logger.log('Redis connections closed');
      }
    } catch (error) {
      this.logger.error('Error closing Redis connections:', error);
    }
  }
}
