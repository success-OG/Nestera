import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Horizon } from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';
import { ProtocolMetrics } from '../admin-analytics/entities/protocol-metrics.entity';
import {
  BalanceChangedEvent,
  BALANCE_CHANGED_EVENT,
  ConnectionMetricsSummary,
  StreamHandle,
} from './balance-sync.types';

const CONFIG_DEFAULTS = {
  cacheTtlSeconds: 300,
  pollIntervalMs: 5000,
  reconnectInitialDelayMs: 1000,
  reconnectMaxDelayMs: 60000,
  metricsPersistIntervalMs: 60000,
} as const;

@Injectable()
export class BalanceSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BalanceSyncService.name);

  private handles: Map<string, StreamHandle> = new Map();

  private cacheTtlSeconds: number;
  private pollIntervalMs: number;
  private reconnectInitialDelayMs: number;
  private reconnectMaxDelayMs: number;
  private metricsPersistIntervalMs: number;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
    private readonly stellarService: StellarService,
    @InjectRepository(ProtocolMetrics)
    private readonly protocolMetricsRepo: Repository<ProtocolMetrics>,
  ) {}

  onModuleInit(): void {
    this.cacheTtlSeconds = this.resolveConfig(
      'balanceSync.cacheTtlSeconds',
      CONFIG_DEFAULTS.cacheTtlSeconds,
    );

    this.pollIntervalMs = this.resolveConfig(
      'balanceSync.pollIntervalMs',
      CONFIG_DEFAULTS.pollIntervalMs,
    );

    this.reconnectInitialDelayMs = this.resolveConfig(
      'balanceSync.reconnectInitialDelayMs',
      CONFIG_DEFAULTS.reconnectInitialDelayMs,
    );

    this.reconnectMaxDelayMs = this.resolveConfig(
      'balanceSync.reconnectMaxDelayMs',
      CONFIG_DEFAULTS.reconnectMaxDelayMs,
    );

    this.metricsPersistIntervalMs = this.resolveConfig(
      'balanceSync.metricsPersistIntervalMs',
      CONFIG_DEFAULTS.metricsPersistIntervalMs,
    );

    // Validate pollIntervalMs range (Requirement 8.3)
    if (this.pollIntervalMs <= 0 || this.pollIntervalMs > 60000) {
      this.logger.error(
        `pollIntervalMs value ${this.pollIntervalMs} is out of range (must be > 0 and <= 60000). ` +
          `Substituting default: ${CONFIG_DEFAULTS.pollIntervalMs}`,
      );
      this.pollIntervalMs = CONFIG_DEFAULTS.pollIntervalMs;
    }

    this.logger.log(
      `BalanceSyncService initialised with config: ` +
        `cacheTtlSeconds=${this.cacheTtlSeconds}, ` +
        `pollIntervalMs=${this.pollIntervalMs}, ` +
        `reconnectInitialDelayMs=${this.reconnectInitialDelayMs}, ` +
        `reconnectMaxDelayMs=${this.reconnectMaxDelayMs}, ` +
        `metricsPersistIntervalMs=${this.metricsPersistIntervalMs}`,
    );

    this.metricsTimer = setInterval(() => {
      void this.persistMetrics();
    }, this.metricsPersistIntervalMs);
  }

  onModuleDestroy(): void {
    this.logger.log('BalanceSyncService destroying');

    if (this.metricsTimer !== null) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    const accountCount = this.handles.size;
    for (const publicKey of this.handles.keys()) {
      this.unsubscribe(publicKey);
    }

    this.logger.log(`Cleaned up ${accountCount} account(s)`);
  }

  subscribe(publicKey: string): void {
    if (this.handles.has(publicKey)) {
      this.logger.debug(`Already subscribed to account ${publicKey}, skipping`);
      return;
    }

    const handle: StreamHandle = {
      close: () => {},
      connected: false,
      reconnect: {
        delayMs: this.reconnectInitialDelayMs,
        attempt: 0,
        timer: null,
      },
      pollTimer: null,
      metrics: {
        publicKey,
        streamUptimeSeconds: 0,
        reconnectCount: 0,
        fallbackActive: false,
        connectedAt: null,
      },
    };

    this.handles.set(publicKey, handle);
    this.openStream(publicKey);
  }

  unsubscribe(publicKey: string): void {
    if (!this.handles.has(publicKey)) {
      this.logger.debug(
        `unsubscribe called for unknown account ${publicKey}, skipping`,
      );
      return;
    }

    const handle = this.handles.get(publicKey)!;

    handle.close();

    if (handle.reconnect.timer !== null) {
      clearTimeout(handle.reconnect.timer);
    }

    this.deactivatePollingFallback(publicKey);
    this.handles.delete(publicKey);

    this.logger.log(`Unsubscribed account ${publicKey}`);
  }

  getMetricsSummary(): ConnectionMetricsSummary {
    const accounts = Array.from(this.handles.entries()).map(([, handle]) => {
      const streamUptimeSeconds =
        handle.connected && handle.metrics.connectedAt
          ? Math.floor(
              (Date.now() - handle.metrics.connectedAt.getTime()) / 1000,
            )
          : handle.metrics.streamUptimeSeconds;

      return {
        ...handle.metrics,
        streamUptimeSeconds,
      };
    });

    const anyFallbackActive = accounts.some((a) => a.fallbackActive);
    const totalReconnects = accounts.reduce(
      (sum, a) => sum + a.reconnectCount,
      0,
    );

    return { accounts, anyFallbackActive, totalReconnects };
  }

  /**
   * Process an incoming account record from the Horizon stream.
   * For each asset balance, compare against the cached value and emit
   * a BalanceChangedEvent if the balance has changed (Requirements 3.1, 3.3, 3.4).
   */
  private async processAccountUpdate(
    accountRecord: Horizon.AccountResponse,
  ): Promise<void> {
    const accountId = accountRecord.account_id;

    for (const balance of accountRecord.balances) {
      const assetCode =
        balance.asset_type === 'native'
          ? 'native'
          : (balance as Horizon.HorizonApi.BalanceLineAsset).asset_code;

      const newBalance = balance.balance;
      const previousBalance = await this.readBalanceFromCache(
        accountId,
        assetCode,
      );

      if (newBalance !== previousBalance) {
        await this.writeBalanceToCache(accountId, assetCode, newBalance);

        const event = new BalanceChangedEvent();
        event.accountId = accountId;
        event.assetCode = assetCode;
        event.previousBalance = previousBalance ?? '0';
        event.newBalance = newBalance;
        event.changedAt = new Date();

        this.eventEmitter.emit(BALANCE_CHANGED_EVENT, event);
      }
    }
  }

  /**
   * Write a balance entry to the cache.
   * Key: `balance:{publicKey}:{assetCode}`
   * On any error: log at warn level and do not rethrow (Requirement 2.4).
   */
  private async writeBalanceToCache(
    publicKey: string,
    assetCode: string,
    balance: string,
  ): Promise<void> {
    const key = `balance:${publicKey}:${assetCode}`;
    try {
      const value = JSON.stringify({
        balance,
        updatedAt: new Date().toISOString(),
      });
      const ttl = this.cacheTtlSeconds * 1000; // cache-manager uses milliseconds
      await this.cacheManager.set(key, value, ttl);
    } catch (err) {
      this.logger.warn(
        `Failed to write balance cache for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * Read a balance entry from the cache.
   * Returns the `balance` field from the stored JSON, or null on miss/error.
   */
  private async readBalanceFromCache(
    publicKey: string,
    assetCode: string,
  ): Promise<string | null> {
    const key = `balance:${publicKey}:${assetCode}`;
    try {
      const result = await this.cacheManager.get<string>(key);
      if (typeof result === 'string') {
        const parsed = JSON.parse(result) as { balance: string };
        return parsed.balance;
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to read balance cache for key "${key}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Open a Horizon SSE stream for the given account.
   * Stores the SDK-returned close function on the handle.
   * Requirements: 1.1, 1.2, 1.3
   */
  private openStream(publicKey: string): void {
    const handle = this.handles.get(publicKey);
    if (!handle) return;

    const horizonServer = this.stellarService.getHorizonServer();

    const closeStream = horizonServer
      .accounts()
      .accountId(publicKey)
      .stream({
        onmessage: (accountRecord) => {
          handle.connected = true;
          handle.metrics.connectedAt = handle.metrics.connectedAt ?? new Date();
          this.processAccountUpdate(
            accountRecord as unknown as Horizon.AccountResponse,
          ).catch((err) =>
            this.logger.error(
              `Error processing account update for ${publicKey}: ${(err as Error).message}`,
            ),
          );
        },
        onerror: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Stream error for ${publicKey}: ${message}`);
          handle.connected = false;
          this.scheduleReconnect(publicKey);
          this.activatePollingFallback(publicKey);
        },
      });

    handle.close = closeStream;
    this.logger.log(`Opened Horizon SSE stream for account ${publicKey}`);
  }

  /**
   * Schedule an exponential back-off reconnect attempt for the given account.
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  private scheduleReconnect(publicKey: string): void {
    const handle = this.handles.get(publicKey);
    if (!handle) return;

    // Already scheduled — don't double-schedule
    if (handle.reconnect.timer !== null) return;

    const delay = Math.min(
      this.reconnectInitialDelayMs * Math.pow(2, handle.reconnect.attempt),
      this.reconnectMaxDelayMs,
    );
    handle.reconnect.delayMs = delay;

    this.logger.log(
      `Scheduling reconnect for ${publicKey}: attempt ${handle.reconnect.attempt + 1}, delay ${delay} ms`,
    );

    handle.reconnect.timer = setTimeout(() => {
      handle.reconnect.timer = null;
      handle.reconnect.attempt++;
      handle.metrics.reconnectCount++;

      try {
        this.openStream(publicKey);
        // Stream opened without throwing — reset back-off state
        handle.reconnect.attempt = 0;
        handle.reconnect.delayMs = this.reconnectInitialDelayMs;
        this.logger.log(`Stream recovered for account ${publicKey}`);
        this.deactivatePollingFallback(publicKey);
      } catch (err) {
        this.logger.error(
          `Reconnect attempt failed for ${publicKey}: ${(err as Error).message}`,
        );
        this.scheduleReconnect(publicKey);
      }
    }, delay);
  }

  /**
   * Activate the polling fallback for an account whose stream is down.
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  private activatePollingFallback(publicKey: string): void {
    const handle = this.handles.get(publicKey);
    if (!handle) return;

    // Idempotent — already polling
    if (handle.pollTimer !== null) return;

    handle.metrics.fallbackActive = true;
    this.logger.log(`Activating polling fallback for account ${publicKey}`);

    handle.pollTimer = setInterval(async () => {
      try {
        const horizonServer = this.stellarService.getHorizonServer();
        const account = await horizonServer
          .accounts()
          .accountId(publicKey)
          .call();
        await this.processAccountUpdate(
          account as unknown as Horizon.AccountResponse,
        );
      } catch (err) {
        this.logger.warn(
          `Polling fallback error for ${publicKey}: ${(err as Error).message}`,
        );
      }
    }, this.pollIntervalMs);
  }

  /**
   * Deactivate the polling fallback once the stream is re-established.
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  private deactivatePollingFallback(publicKey: string): void {
    const handle = this.handles.get(publicKey);
    if (!handle) return;

    // Idempotent — not polling
    if (handle.pollTimer === null) return;

    clearInterval(handle.pollTimer);
    handle.pollTimer = null;
    handle.metrics.fallbackActive = false;
    this.logger.log(`Polling fallback deactivated for account ${publicKey}`);
  }

  /**
   * Persist the current connection metrics snapshot to ProtocolMetrics.
   * Upserts into the most recent record, or creates a minimal one if none exists.
   * Requirements: 6.5
   */
  private async persistMetrics(): Promise<void> {
    try {
      const summary = this.getMetricsSummary();
      const record = await this.protocolMetricsRepo.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });
      if (record) {
        record.connectionMetrics = summary;
        await this.protocolMetricsRepo.save(record);
      } else {
        const newRecord = this.protocolMetricsRepo.create({
          snapshotDate: new Date(),
          totalValueLockedUsd: 0,
          totalValueLockedXlm: 0,
          savingsProductCount: 0,
          connectionMetrics: summary,
        });
        await this.protocolMetricsRepo.save(newRecord);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to persist connection metrics: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Resolve a config value, logging a warning and using the default if absent.
   */
  private resolveConfig<T>(key: string, defaultValue: T): T {
    const value = this.configService.get<T>(key);
    if (value === undefined || value === null) {
      this.logger.warn(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Config key "${key}" is absent. Using default: ${defaultValue}`,
      );
      return defaultValue;
    }
    return value;
  }
}
