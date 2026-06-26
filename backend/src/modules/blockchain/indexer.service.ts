import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { rpc } from '@stellar/stellar-sdk';
import { DeadLetterEvent } from './entities/dead-letter-event.entity';
import { IndexerState } from './entities/indexer-state.entity';
import { DepositHandler } from './event-handlers/deposit.handler';
import { WithdrawHandler } from './event-handlers/withdraw.handler';
import { YieldHandler } from './event-handlers/yield.handler';
import { StellarService } from './stellar.service';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

/** Shape of a raw Soroban event as returned by the RPC. */
interface SorobanEvent {
  id?: string;
  ledger: number;
  topic?: unknown[];
  value?: unknown;
  txHash?: string;
  [key: string]: unknown;
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);

  private rpcServer: rpc.Server | null = null;

  /** In-memory cache of contract IDs to monitor */
  private contractIds: Set<string> = new Set();

  /** In-memory state synced with DB */
  private indexerState: IndexerState | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
    @InjectRepository(DeadLetterEvent)
    private readonly dlqRepo: Repository<DeadLetterEvent>,
    @InjectRepository(IndexerState)
    private readonly indexerStateRepo: Repository<IndexerState>,
    @InjectRepository(SavingsProduct)
    private readonly savingsProductRepo: Repository<SavingsProduct>,
    private readonly depositHandler: DepositHandler,
    private readonly withdrawHandler: WithdrawHandler,
    private readonly yieldHandler: YieldHandler,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Blockchain Event Indexer...');

    this.rpcServer = this.stellarService.getRpcServer();

    await this.initializeIndexerState();
    await this.loadContractIds();

    this.logger.log(
      `Blockchain indexer initialized. Monitoring ${this.contractIds.size} contract(s).`,
    );
  }

  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_5_SECONDS)
  async runIndexerCycle(): Promise<void> {
    if (!this.indexerState) return;

    // Reload contract IDs to ensure we're watching any new active products
    await this.loadContractIds();
    if (this.contractIds.size === 0) {
      this.logger.debug('No active contracts to monitor');
      return;
    }

    try {
      const events = await this.fetchEvents();

      if (events.length === 0) {
        this.logger.debug('No new events found');
        return;
      }

      let processed = 0;
      let failed = 0;

      for (const event of events) {
        const ok = await this.processEvent(event);
        if (ok) {
          processed++;
        } else {
          failed++;
        }
      }

      this.logger.log(
        `Processed ${processed} events (Failed: ${failed}) from ledger ${events[0].ledger} to ${events[events.length - 1].ledger}`,
      );

      this.indexerState.totalEventsProcessed += processed;
      this.indexerState.totalEventsFailed += failed;
      this.indexerState.updatedAt = new Date();

      await this.saveIndexerState();
    } catch (err) {
      this.logger.error(`Indexer cycle failed: ${(err as Error).message}`);
    }
  }

  private async initializeIndexerState() {
    let state = await this.indexerStateRepo.findOne({ where: {} });

    if (!state) {
      state = await this.indexerStateRepo.save(
        this.indexerStateRepo.create({
          lastProcessedLedger: 0,
          lastProcessedTimestamp: null,
          totalEventsProcessed: 0,
          totalEventsFailed: 0,
        }),
      );
    }

    this.indexerState = state;
  }

  private async loadContractIds() {
    const products = await this.savingsProductRepo.find({
      where: { isActive: true },
    });

    const newSet = new Set<string>();
    for (const p of products) {
      if (p.contractId) newSet.add(p.contractId);
    }

    this.contractIds = newSet;
  }

  private async saveIndexerState() {
    if (this.indexerState) {
      await this.indexerStateRepo.save(this.indexerState);
    }
  }

  private async processEvent(event: SorobanEvent): Promise<boolean> {
    try {
      await this.handleEvent(event);

      if (
        this.indexerState &&
        event.ledger > this.indexerState.lastProcessedLedger
      ) {
        this.indexerState.lastProcessedLedger = event.ledger;
        this.indexerState.lastProcessedTimestamp = Date.now();
      }

      return true;
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(
        `FAILURE at Ledger ${event.ledger}: Processing of event ${event.id} crashed. JSON: ${JSON.stringify(event)}. Error: ${msg}`,
      );

      await this.dlqRepo.save(
        this.dlqRepo.create({
          ledgerSequence: event.ledger,
          rawEvent: JSON.stringify(event),
          errorMessage: msg,
        }),
      );

      return false;
    }
  }

  private async handleEvent(event: SorobanEvent): Promise<void> {
    if (await this.depositHandler.handle(event)) return;
    if (await this.withdrawHandler.handle(event)) return;
    if (await this.yieldHandler.handle(event)) return;

    this.logger.debug(`Unhandled event: ${JSON.stringify(event.topic)}`);
  }

  private async fetchEvents(): Promise<SorobanEvent[]> {
    if (!this.indexerState) return [];

    const rpcEvents = await this.stellarService.getEvents(
      this.indexerState.lastProcessedLedger + 1,
      Array.from(this.contractIds),
    );

    return rpcEvents
      .map((e) => ({
        id: e.id,
        ledger: parseInt(e.ledger, 10),
        topic: e.topic,
        value: e.value,
        txHash: e.txHash,
      }))
      .sort((a, b) => a.ledger - b.ledger);
  }

  getIndexerState() {
    return this.indexerState;
  }

  getLastProcessedTimestamp(): number | null {
    return this.indexerState?.lastProcessedTimestamp ?? null;
  }

  async reloadContractIds() {
    await this.loadContractIds();
  }

  getMonitoredContracts(): string[] {
    return Array.from(this.contractIds);
  }
}
