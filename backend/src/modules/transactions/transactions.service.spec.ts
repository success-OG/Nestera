import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import {
  LedgerTransaction,
  LedgerTransactionStatus,
  LedgerTransactionType,
} from '../blockchain/entities/transaction.entity';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { Order } from '../../common/dto/page-options.dto';
import { AutoCategorizationService } from './auto-categorization.service';
import { TransactionSavedSearch } from './entities/transaction-saved-search.entity';
import { TransactionSortBy } from './dto/transaction-search-criteria.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: Repository<LedgerTransaction>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockSavedSearchRepository = {
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    })),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(LedgerTransaction),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(TransactionSavedSearch),
          useValue: mockSavedSearchRepository,
        },
        {
          provide: AutoCategorizationService,
          useValue: { categorize: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<Repository<LedgerTransaction>>(
      getRepositoryToken(LedgerTransaction),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForUser', () => {
    const userId = 'test-user-id';
    const mockTransactions: Partial<LedgerTransaction>[] = [
      {
        id: '1',
        userId,
        type: LedgerTransactionType.DEPOSIT,
        status: LedgerTransactionStatus.COMPLETED,
        amount: '100.50',
        publicKey: 'GTEST123',
        eventId: 'event-1',
        transactionHash: 'hash-1',
        ledgerSequence: '12345',
        poolId: 'pool-1',
        metadata: { test: 'data' },
        createdAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    it('should return paginated transactions for a user', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        order: Order.DESC,
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockTransactions as LedgerTransaction[],
        1,
      ]);

      const result = await service.findAllForUser(userId, queryDto);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'transaction',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'transaction.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'transaction.createdAt',
        'DESC',
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(userId);
      expect(result.data[0].status).toBe(LedgerTransactionStatus.COMPLETED);
      expect(result.data[0].formattedDate).toBeDefined();
      expect(result.data[0].formattedTime).toBeDefined();
      expect(result.meta.totalItemCount).toBe(1);
    });

    it('should filter by transaction types', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        type: [LedgerTransactionType.DEPOSIT, LedgerTransactionType.YIELD],
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.type IN (:...types)',
        { types: queryDto.type },
      );
    });

    it('should filter by date range', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.createdAt >= :startDate',
        { startDate: new Date(queryDto.startDate) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.createdAt <= :endDate',
        { endDate: new Date(queryDto.endDate) },
      );
    });

    it('should filter by status and amount range', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        status: [LedgerTransactionStatus.COMPLETED],
        minAmount: '25.00',
        maxAmount: '150.00',
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.status IN (:...statuses)',
        { statuses: queryDto.status },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.amount >= :minAmount',
        { minAmount: '25.00' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.amount <= :maxAmount',
        { maxAmount: '150.00' },
      );
    });

    it('should filter by pool ID', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        poolId: 'pool-123',
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.poolId = :poolId',
        { poolId: 'pool-123' },
      );
    });

    it('should apply pagination correctly', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 2,
        limit: 50,
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(50); // (page 2 - 1) * 50
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should apply requested sort field and order', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        sortBy: TransactionSortBy.AMOUNT,
        order: Order.ASC,
      });

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllForUser(userId, queryDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'transaction.amount',
        'ASC',
      );
    });
  });
});
