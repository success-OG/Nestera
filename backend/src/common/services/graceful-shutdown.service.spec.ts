import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SchedulerRegistry } from '@nestjs/schedule';
import { GracefulShutdownService } from './graceful-shutdown.service';

describe('GracefulShutdownService', () => {
  let service: GracefulShutdownService;
  let mockDataSource: any;
  let mockCacheManager: any;
  let mockSchedulerRegistry: any;

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheManager = {
      reset: jest.fn().mockResolvedValue(undefined),
    };

    mockSchedulerRegistry = {
      getCronJobs: jest.fn().mockReturnValue(new Map()),
      getIntervals: jest.fn().mockReturnValue([]),
      getTimeouts: jest.fn().mockReturnValue([]),
      deleteInterval: jest.fn(),
      deleteTimeout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GracefulShutdownService,
        { provide: 'DataSource', useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = new GracefulShutdownService(
      mockDataSource,
      mockCacheManager,
      mockSchedulerRegistry,
    );
  });

  it('should track active requests', () => {
    expect(service.getActiveRequestCount()).toBe(0);
    service.incrementActiveRequests();
    service.incrementActiveRequests();
    expect(service.getActiveRequestCount()).toBe(2);
    service.decrementActiveRequests();
    expect(service.getActiveRequestCount()).toBe(1);
  });

  it('should not go below zero active requests', () => {
    service.decrementActiveRequests();
    expect(service.getActiveRequestCount()).toBe(0);
  });

  it('should not accept new requests during shutdown', async () => {
    expect(service.isShutdown()).toBe(false);
    await service.onApplicationShutdown('SIGTERM');
    expect(service.isShutdown()).toBe(true);
  });

  it('should close database on shutdown', async () => {
    await service.onApplicationShutdown('SIGTERM');
    expect(mockDataSource.destroy).toHaveBeenCalled();
  });

  it('should close Redis on shutdown', async () => {
    await service.onApplicationShutdown('SIGTERM');
    expect(mockCacheManager.reset).toHaveBeenCalled();
  });

  it('should stop scheduled jobs on shutdown', async () => {
    const mockCronJob = { stop: jest.fn() };
    mockSchedulerRegistry.getCronJobs.mockReturnValue(
      new Map([['test-cron', mockCronJob]]),
    );

    await service.onApplicationShutdown('SIGTERM');
    expect(mockCronJob.stop).toHaveBeenCalled();
  });

  it('should stop registered background workers on shutdown', async () => {
    const worker = {
      name: 'test-worker',
      shutdown: jest.fn().mockResolvedValue(undefined),
    };
    service.registerWorker(worker);

    await service.onApplicationShutdown('SIGTERM');
    expect(worker.shutdown).toHaveBeenCalled();
  });

  it('should handle worker shutdown failures gracefully', async () => {
    const worker = {
      name: 'failing-worker',
      shutdown: jest.fn().mockRejectedValue(new Error('shutdown failed')),
    };
    service.registerWorker(worker);

    await expect(
      service.onApplicationShutdown('SIGTERM'),
    ).resolves.not.toThrow();
  });

  it('should not increment requests when shutting down', async () => {
    await service.onApplicationShutdown('SIGTERM');
    service.incrementActiveRequests();
    expect(service.getActiveRequestCount()).toBe(0);
  const createService = () => {
    jest.useFakeTimers();

    const dataSource = {
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
    } as const;

    const schedulerRegistry = {
      getCronJobs: jest
        .fn()
        .mockReturnValue(new Map([['heartbeat', { stop: jest.fn() }]])),
      getIntervals: jest.fn().mockReturnValue(['metrics']),
      getInterval: jest
        .fn()
        .mockReturnValue(setInterval(() => undefined, 1_000)),
      deleteInterval: jest.fn(),
      getTimeouts: jest.fn().mockReturnValue(['reconnect']),
      getTimeout: jest.fn().mockReturnValue(setTimeout(() => undefined, 1_000)),
      deleteTimeout: jest.fn(),
    } as unknown as SchedulerRegistry;

    const service = new GracefulShutdownService(
      dataSource as never,
      undefined,
      schedulerRegistry,
    );

    return { dataSource, schedulerRegistry, service };
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('tracks background tasks while they are running', async () => {
    const { service } = createService();

    let releaseTask!: () => void;
    const runningTask = GracefulShutdownService.runTrackedTask(
      'spec.task',
      () =>
        new Promise<void>((resolve) => {
          releaseTask = resolve;
        }),
    );

    expect(service.getActiveBackgroundTaskCount()).toBe(1);

    releaseTask();
    await runningTask;

    expect(service.getActiveBackgroundTaskCount()).toBe(0);
  });

  it('skips new background tasks after shutdown starts', async () => {
    const { service } = createService();
    const task = jest.fn();

    service.beginShutdown('SIGTERM');
    await GracefulShutdownService.runTrackedTask('spec.task', task);

    expect(task).not.toHaveBeenCalled();
  });

  it('stops schedulers and closes the database during shutdown', async () => {
    const { dataSource, schedulerRegistry, service } = createService();

    await service.beforeApplicationShutdown('SIGTERM');

    const cronJobs = schedulerRegistry.getCronJobs() as unknown as Map<
      string,
      { stop: jest.Mock }
    >;
    const heartbeatJob = cronJobs.get('heartbeat');

    expect(heartbeatJob?.stop).toHaveBeenCalled();
    expect(schedulerRegistry.deleteInterval).toHaveBeenCalledWith('metrics');
    expect(schedulerRegistry.deleteTimeout).toHaveBeenCalledWith('reconnect');
    expect(dataSource.destroy).toHaveBeenCalled();
  });
});
