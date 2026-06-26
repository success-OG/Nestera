import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Optional } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { DataSource } from 'typeorm';

type ShutdownManagedServer = Server & {
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
};

export type BackgroundWorker = {
  name: string;
  shutdown: () => Promise<void>;
};

@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private static instance: GracefulShutdownService | null = null;

  private readonly logger = new Logger(GracefulShutdownService.name);
  private readonly activeSockets = new Set<Socket>();
  private readonly shutdownTimeoutMs = 30_000;
  private readonly drainPollIntervalMs = 250;

  private isShuttingDown = false;
  private schedulersStopped = false;
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
  private activeBackgroundTasks = 0;
  private registeredHttpServer?: ShutdownManagedServer;
  private closeServerPromise: Promise<void> | null = null;
  private shutdownPromise: Promise<number> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cacheManager?: Cache,
    @Optional()
    private readonly schedulerRegistry?: SchedulerRegistry,
  ) {
    GracefulShutdownService.instance = this;
  }

  static async runTrackedTask<T>(
    taskName: string,
    task: () => Promise<T> | T,
  ): Promise<T | undefined> {
    if (!GracefulShutdownService.instance) {
      return Promise.resolve(task());
    }

    return GracefulShutdownService.instance.runBackgroundTask(taskName, task);
  }

  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  registerHttpServer(server: Server): void {
    if (this.registeredHttpServer === server) {
      return;
    }

    this.registeredHttpServer = server as ShutdownManagedServer;
    this.registeredHttpServer.on('connection', (socket: Socket) => {
      this.activeSockets.add(socket);
      socket.once('close', () => {
        this.activeSockets.delete(socket);
      });
    });
  }

  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  getActiveBackgroundTaskCount(): number {
    return this.activeBackgroundTasks;
  }

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
  incrementActiveRequests(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.activeRequests += 1;
  }

  decrementActiveRequests(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  beginShutdown(signal?: string): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.warn(
      `Graceful shutdown initiated${signal ? ` by ${signal}` : ''}`,
    );
  }

  async shutdownApplication(
    signal: NodeJS.Signals,
    closeApplication: () => Promise<void>,
    flushLogs?: () => Promise<void> | void,
  ): Promise<number> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.beginShutdown(signal);

    this.shutdownPromise = (async () => {
      try {
        await this.closeHttpServer();
        await closeApplication();
        await flushLogs?.();
        return 0;
      } catch (error) {
        const message =
          error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Graceful shutdown failed: ${message}`);
        await flushLogs?.();
        return 1;
      }
    })();

    return this.shutdownPromise;
  }

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.beginShutdown(signal);
    this.stopSchedulers();
    this.registeredHttpServer?.closeIdleConnections?.();

    await this.waitForDrain(this.shutdownTimeoutMs - 5_000);
    await this.closeCacheConnections();
    await this.closeDatabaseConnections();
  }

  private async runBackgroundTask<T>(
    taskName: string,
    task: () => Promise<T> | T,
  ): Promise<T | undefined> {
    if (this.isShuttingDown) {
      this.logger.warn(
        `Skipping background task "${taskName}" because shutdown is in progress`,
      );
      return undefined;
    }

    this.activeBackgroundTasks += 1;

    try {
      return await task();
    } finally {
      this.activeBackgroundTasks = Math.max(0, this.activeBackgroundTasks - 1);
    }
  }

  private async closeHttpServer(): Promise<void> {
    if (!this.registeredHttpServer) {
      return;
    }

      if (elapsed > this.maxDrainTimeout) {
    if (this.closeServerPromise) {
      return this.closeServerPromise;
    }

    const server = this.registeredHttpServer;

    this.closeServerPromise = new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(forceCloseTimer);
        resolve();
      };

      const forceCloseTimer = setTimeout(() => {
        this.logger.warn(
          'HTTP server drain timeout reached. Closing remaining sockets.',
        );
        server.closeAllConnections?.();
        this.destroyOpenSockets();
        finish();
      }, this.shutdownTimeoutMs);

      try {
        server.close((error?: Error) => {
          if (
            error &&
            (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
          ) {
            this.logger.error(
              `Error while closing HTTP server: ${error.message}`,
            );
          }
          finish();
        });
        server.closeIdleConnections?.();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to stop HTTP server: ${message}`);
        }
        finish();
      }
    });

    return this.closeServerPromise;
  }

  private stopSchedulers(): void {
    if (!this.schedulerRegistry || this.schedulersStopped) {
      return;
    }

    this.schedulersStopped = true;

    for (const [name, job] of this.schedulerRegistry.getCronJobs()) {
      job.stop();
      this.logger.log(`Stopped cron job "${name}"`);
    }

    for (const name of this.schedulerRegistry.getIntervals()) {
      clearInterval(this.schedulerRegistry.getInterval(name));
      this.schedulerRegistry.deleteInterval(name);
      this.logger.log(`Cleared interval "${name}"`);
    }

    for (const name of this.schedulerRegistry.getTimeouts()) {
      clearTimeout(this.schedulerRegistry.getTimeout(name));
      this.schedulerRegistry.deleteTimeout(name);
      this.logger.log(`Cleared timeout "${name}"`);
    }
  }

  private async waitForDrain(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();

    while (this.activeRequests > 0 || this.activeBackgroundTasks > 0) {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= timeoutMs) {
        this.logger.warn(
          `Shutdown drain timed out with ${this.activeRequests} active request(s) and ${this.activeBackgroundTasks} active background task(s) remaining.`,
        );
        return;
      }

      this.logger.log(
        `Waiting for shutdown drain: ${this.activeRequests} active request(s), ${this.activeBackgroundTasks} active background task(s)`,
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
      await this.delay(this.drainPollIntervalMs);
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      return;
    }

    try {
      this.logger.log('Closing database connections');
      await this.dataSource.destroy();
      this.logger.log('Database connections closed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error closing database connections: ${message}`);
    }
  }

  private async closeCacheConnections(): Promise<void> {
    if (!this.cacheManager) {
      return;
    }

    const manager = this.cacheManager as Cache & {
      store?: {
        client?: {
          quit?: () => Promise<void>;
          disconnect?: () => Promise<void>;
        };
      };
      stores?: Array<{
        client?: {
          quit?: () => Promise<void>;
          disconnect?: () => Promise<void>;
        };
      }>;
    };

    const store = manager.store ?? manager.stores?.[0];
    const client = store?.client;

    try {
      if (client?.quit) {
        this.logger.log('Closing cache connections');
        await client.quit();
        this.logger.log('Cache connections closed');
        return;
      }

      if (client?.disconnect) {
        this.logger.log('Disconnecting cache client');
        await client.disconnect();
        this.logger.log('Cache connections closed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error closing cache connections: ${message}`);
    }
  }

  private destroyOpenSockets(): void {
    for (const socket of this.activeSockets) {
      socket.destroy();
    }
    this.activeSockets.clear();
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
