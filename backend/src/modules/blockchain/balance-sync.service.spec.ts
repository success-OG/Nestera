import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BalanceSyncService } from './balance-sync.service';
import { StellarService } from './stellar.service';
import { ProtocolMetrics } from '../admin-analytics/entities/protocol-metrics.entity';

// Requirements: 1.2, 1.4

const MOCK_PUBLIC_KEY_A =
  'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const MOCK_PUBLIC_KEY_B =
  'GBCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

function buildConfigValues(): Record<string, unknown> {
  return {
    'balanceSync.cacheTtlSeconds': 300,
    'balanceSync.pollIntervalMs': 5000,
    'balanceSync.reconnectInitialDelayMs': 1000,
    'balanceSync.reconnectMaxDelayMs': 60000,
    'balanceSync.metricsPersistIntervalMs': 60000,
  };
}

function makeStreamMock() {
  const closeFn = jest.fn();
  // Returns a close function, simulating the Stellar SDK stream() API
  const streamFn = jest.fn().mockReturnValue(closeFn);
  return { closeFn, streamFn };
}

function buildHorizonServerMock(streamFn: jest.Mock) {
  return {
    accounts: jest.fn().mockReturnValue({
      accountId: jest.fn().mockReturnValue({
        stream: streamFn,
        call: jest
          .fn()
          .mockResolvedValue({ account_id: MOCK_PUBLIC_KEY_A, balances: [] }),
      }),
    }),
  };
}

describe('BalanceSyncService', () => {
  let service: BalanceSyncService;
  let closeFnA: jest.Mock;
  let closeFnB: jest.Mock;
  let streamFnA: jest.Mock;

  async function buildModule(streamFn?: jest.Mock) {
    const { closeFn, streamFn: defaultStreamFn } = makeStreamMock();
    closeFnA = closeFn;
    streamFnA = streamFn ?? defaultStreamFn;

    const horizonServerMock = buildHorizonServerMock(streamFnA);

    const configValues = buildConfigValues();
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockStellarService = {
      getHorizonServer: jest.fn().mockReturnValue(horizonServerMock),
    };

    const mockProtocolMetricsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceSyncService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: StellarService, useValue: mockStellarService },
        {
          provide: getRepositoryToken(ProtocolMetrics),
          useValue: mockProtocolMetricsRepo,
        },
      ],
    }).compile();

    service = module.get<BalanceSyncService>(BalanceSyncService);
    // Trigger onModuleInit to load config
    service.onModuleInit();

    return module;
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe()', () => {
    it('opens a stream and stores the handle', async () => {
      await buildModule();

      service.subscribe(MOCK_PUBLIC_KEY_A);

      const summary = service.getMetricsSummary();
      expect(summary.accounts).toHaveLength(1);
      expect(summary.accounts[0].publicKey).toBe(MOCK_PUBLIC_KEY_A);
      expect(streamFnA).toHaveBeenCalledTimes(1);
    });

    it('is idempotent — calling twice does not open two streams', async () => {
      await buildModule();

      service.subscribe(MOCK_PUBLIC_KEY_A);
      service.subscribe(MOCK_PUBLIC_KEY_A);

      expect(streamFnA).toHaveBeenCalledTimes(1);
      expect(service.getMetricsSummary().accounts).toHaveLength(1);
    });
  });

  describe('unsubscribe()', () => {
    it('closes the stream and removes the handle', async () => {
      await buildModule();

      service.subscribe(MOCK_PUBLIC_KEY_A);
      service.unsubscribe(MOCK_PUBLIC_KEY_A);

      expect(closeFnA).toHaveBeenCalledTimes(1);
      expect(service.getMetricsSummary().accounts).toHaveLength(0);
    });

    it('is idempotent — calling on unknown key does not throw', async () => {
      await buildModule();

      expect(() => service.unsubscribe('UNKNOWN_KEY')).not.toThrow();
    });
  });

  describe('onModuleDestroy()', () => {
    it('closes all open streams and cancels all timers', async () => {
      // Build a module where each accountId gets its own close function
      const closeFnForA = jest.fn();
      const closeFnForB = jest.fn();
      let callCount = 0;
      const multiStreamFn = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? closeFnForA : closeFnForB;
      });

      const horizonServerMock = buildHorizonServerMock(multiStreamFn);

      const configValues = buildConfigValues();
      const mockConfigService = {
        get: jest.fn((key: string) => configValues[key]),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BalanceSyncService,
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn().mockResolvedValue(null),
              set: jest.fn(),
            },
          },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          {
            provide: StellarService,
            useValue: {
              getHorizonServer: jest.fn().mockReturnValue(horizonServerMock),
            },
          },
          {
            provide: getRepositoryToken(ProtocolMetrics),
            useValue: { findOne: jest.fn(), save: jest.fn() },
          },
        ],
      }).compile();

      service = module.get<BalanceSyncService>(BalanceSyncService);
      service.onModuleInit();

      service.subscribe(MOCK_PUBLIC_KEY_A);
      service.subscribe(MOCK_PUBLIC_KEY_B);

      expect(service.getMetricsSummary().accounts).toHaveLength(2);

      service.onModuleDestroy();

      expect(closeFnForA).toHaveBeenCalledTimes(1);
      expect(closeFnForB).toHaveBeenCalledTimes(1);
      expect(service.getMetricsSummary().accounts).toHaveLength(0);
    });
  });
});
