import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import {
  LedgerTransactionStatus,
  LedgerTransactionType,
} from '../blockchain/entities/transaction.entity';
import { PageDto } from '../../common/dto/page.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';
import { Order } from '../../common/dto/page-options.dto';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    findAllForUser: jest.fn(),
    exportTransactions: jest.fn(),
    tagTransaction: jest.fn(),
    listCategories: jest.fn(),
    bulkTag: jest.fn(),
    listSavedSearches: jest.fn(),
    createSavedSearch: jest.fn(),
    updateSavedSearch: jest.fn(),
    deleteSavedSearch: jest.fn(),
    runSavedSearch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTransactions', () => {
    const mockUser = { id: 'test-user-id' };
    const mockResponse: TransactionResponseDto = {
      id: '1',
      userId: mockUser.id,
      type: LedgerTransactionType.DEPOSIT,
      status: LedgerTransactionStatus.COMPLETED,
      amount: '100.50',
      amountFormatted: {
        raw: '100.50',
        numeric: 100.5,
        formatted: '100.50',
        display: '$100.50',
        symbol: 'USDC',
        decimals: 7,
      },
      publicKey: 'GTEST123',
      eventId: 'event-1',
      transactionHash: 'hash-1',
      ledgerSequence: '12345',
      poolId: 'pool-1',
      assetId: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
      metadata: { test: 'data' },
      createdAt: '2024-01-15T10:30:00.000Z',
      formattedDate: 'Jan 15, 2024',
      formattedTime: '10:30:00 AM',
    };

    it('should return paginated transactions for authenticated user', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 1,
        limit: 10,
        order: Order.DESC,
      });

      const mockPageDto = new PageDto(
        [mockResponse],
        new PageMetaDto({
          pageOptionsDto: queryDto,
          totalItemCount: 1,
        }),
      );

      mockTransactionsService.findAllForUser.mockResolvedValue(mockPageDto);

      const result = await controller.getTransactions(mockUser, queryDto);

      expect(service.findAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        queryDto,
      );
      expect(result).toEqual(mockPageDto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItemCount).toBe(1);
    });

    it('should pass query filters to service', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 2,
        limit: 50,
        type: [LedgerTransactionType.DEPOSIT, LedgerTransactionType.YIELD],
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
        poolId: 'pool-123',
        status: [LedgerTransactionStatus.COMPLETED],
      });

      const mockPageDto = new PageDto(
        [],
        new PageMetaDto({
          pageOptionsDto: queryDto,
          totalItemCount: 0,
        }),
      );

      mockTransactionsService.findAllForUser.mockResolvedValue(mockPageDto);

      await controller.getTransactions(mockUser, queryDto);

      expect(service.findAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        queryDto,
      );
    });

    it('should call tagTransaction on POST /:id/tag', async () => {
      const payload = { tags: ['food'], category: 'Groceries', action: 'add' };
      mockTransactionsService.tagTransaction.mockResolvedValue({ ok: true });

      const res = await controller.tagTransaction(
        mockUser,
        'tx-1',
        payload as any,
      );

      expect(service.tagTransaction).toHaveBeenCalledWith(
        mockUser.id,
        'tx-1',
        payload,
      );
      expect(res).toEqual({ ok: true });
    });

    it('should return categories from GET /categories', async () => {
      mockTransactionsService.listCategories.mockResolvedValue([
        'Groceries',
        'Transport',
      ]);

      const res = await controller.getCategories(mockUser);

      expect(service.listCategories).toHaveBeenCalledWith(mockUser.id);
      expect(res).toEqual(['Groceries', 'Transport']);
    });

    it('should call bulkTag on POST /tags/bulk', async () => {
      const body = {
        ids: ['tx-1', 'tx-2'],
        tags: ['food'],
        category: 'Groceries',
      };
      mockTransactionsService.bulkTag.mockResolvedValue({ ok: true, count: 2 });

      const res = await controller.bulkTag(mockUser, body);

      expect(service.bulkTag).toHaveBeenCalledWith(mockUser.id, body);
      expect(res).toEqual({ ok: true, count: 2 });
    });

    it('should create a saved search', async () => {
      const payload = {
        name: 'Large deposits',
        query: {
          type: [LedgerTransactionType.DEPOSIT],
          minAmount: '1000',
          order: Order.DESC,
        },
      };
      mockTransactionsService.createSavedSearch.mockResolvedValue({
        id: 'saved-1',
        userId: mockUser.id,
        ...payload,
        description: null,
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const res = await controller.createSavedSearch(mockUser, payload as any);

      expect(service.createSavedSearch).toHaveBeenCalledWith(
        mockUser.id,
        payload,
      );
      expect(res.id).toBe('saved-1');
    });

    it('should run a saved search with pagination overrides', async () => {
      const queryDto = Object.assign(new TransactionQueryDto(), {
        page: 2,
        limit: 20,
      });
      mockTransactionsService.runSavedSearch.mockResolvedValue({ data: [] });

      await controller.runSavedSearch(mockUser, 'saved-1', queryDto);

      expect(service.runSavedSearch).toHaveBeenCalledWith(
        mockUser.id,
        'saved-1',
        { page: 2, limit: 20 },
      );
    });
  });
});
