import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { PredictiveEvaluatorService } from './services/predictive-evaluator.service';
import { MilestoneService } from './services/milestone.service';
import {
  SavingsProduct,
  SavingsProductType,
} from './entities/savings-product.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SavingsGoal } from './entities/savings-goal.entity';
import { ProductApySnapshot } from './entities/product-apy-snapshot.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { SavingsProductVersionAudit } from './entities/savings-product-version-audit.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';
import { WaitlistService } from './waitlist.service';

const makeProduct = (overrides: Partial<SavingsProduct> = {}): SavingsProduct =>
  ({
    id: 'prod-1',
    name: 'Flexible Plan',
    type: SavingsProductType.FLEXIBLE,
    description: null,
    interestRate: 8,
    minAmount: 100,
    maxAmount: 10000,
    tenureMonths: null,
    contractId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [],
    ...overrides,
  }) as SavingsProduct;

describe('SavingsService – compareProducts', () => {
  let service: SavingsService;
  let productRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    productRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };

    cacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const subscriptionRepoMock = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingsService,
        {
          provide: getRepositoryToken(SavingsProduct),
          useValue: productRepository,
        },
        {
          provide: getRepositoryToken(UserSubscription),
          useValue: subscriptionRepoMock,
        },
        {
          provide: getRepositoryToken(SavingsGoal),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(ProductApySnapshot),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(SavingsProductVersionAudit),
          useValue: { create: jest.fn((v) => v), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(WithdrawalRequest),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: { create: jest.fn((v) => v), save: jest.fn() },
        },
        {
          provide: BlockchainSavingsService,
          useValue: {
            getUserSavingsBalance: jest.fn(),
            getUserVaultBalance: jest.fn(),
            getVaultTotalAssets: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: PredictiveEvaluatorService,
          useValue: {
            calculateProjectedBalance: jest.fn((b) => b),
            isOffTrack: jest.fn(() => false),
            calculateProjectionGap: jest.fn(() => 0),
          },
        },
        {
          provide: MilestoneService,
          useValue: {
            initializeAutomaticMilestones: jest
              .fn()
              .mockResolvedValue(undefined),
            detectAndAchieveMilestones: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: WaitlistService,
          useValue: {
            joinWaitlist: jest.fn().mockResolvedValue({ position: 1 }),
            recordConversion: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SavingsService>(SavingsService);
  });

  it('returns structured comparison for valid product IDs', async () => {
    const products = [
      makeProduct({
        id: 'prod-1',
        type: SavingsProductType.FLEXIBLE,
        interestRate: 8,
      }),
      makeProduct({
        id: 'prod-2',
        type: SavingsProductType.FIXED,
        interestRate: 12,
        tenureMonths: 12,
      }),
    ];
    productRepository.find.mockResolvedValue(products);

    const result = await service.compareProducts(['prod-1', 'prod-2']);

    expect(result.cached).toBe(false);
    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toMatchObject({
      id: 'prod-1',
      apy: 8,
      riskLevel: 'medium',
      tenure: null,
    });
    expect(result.products[1]).toMatchObject({
      id: 'prod-2',
      apy: 12,
      riskLevel: 'low',
      tenure: 12,
    });
  });

  it('includes historical performance data for each product', async () => {
    productRepository.find.mockResolvedValue([
      makeProduct({ id: 'prod-1', interestRate: 10 }),
      makeProduct({ id: 'prod-2', interestRate: 10 }),
    ]);

    const result = await service.compareProducts(['prod-1', 'prod-2']);

    for (const product of result.products) {
      expect(product.historicalPerformance).toHaveLength(2);
      expect(product.historicalPerformance[0]).toHaveProperty('year');
      expect(product.historicalPerformance[0]).toHaveProperty('return');
    }
  });

  it('returns cached: true when result is in cache', async () => {
    const cachedResponse = {
      products: [makeProduct() as any],
      cached: false,
    };
    cacheManager.get.mockResolvedValue(cachedResponse);

    const result = await service.compareProducts(['prod-1', 'prod-2']);

    expect(result.cached).toBe(true);
    expect(productRepository.find).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when a product ID does not exist', async () => {
    productRepository.find.mockResolvedValue([makeProduct({ id: 'prod-1' })]);

    await expect(
      service.compareProducts(['prod-1', 'prod-missing']),
    ).rejects.toThrow(NotFoundException);
  });

  it('stores result in cache after fetching from DB', async () => {
    productRepository.find.mockResolvedValue([
      makeProduct({ id: 'prod-1' }),
      makeProduct({ id: 'prod-2' }),
    ]);

    await service.compareProducts(['prod-1', 'prod-2']);

    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining('compare:'),
      expect.objectContaining({ cached: false }),
      expect.any(Number),
    );
  });
});
