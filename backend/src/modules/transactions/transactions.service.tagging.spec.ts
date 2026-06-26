import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { AutoCategorizationService } from './auto-categorization.service';
import { TransactionSavedSearch } from './entities/transaction-saved-search.entity';

describe('TransactionsService tagging', () => {
  let service: TransactionsService;

  const mockRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    findBy: jest.fn(),
  };

  const mockSavedSearchRepository: any = {
    createQueryBuilder: jest.fn(),
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

    jest.clearAllMocks();
  });

  it('returns not found when tagging a missing transaction', async () => {
    mockRepository.findOne.mockResolvedValue(undefined);

    const res = await service.tagTransaction('user-1', 'tx-1', { tags: ['a'] });

    expect(res).toEqual({ ok: false, message: 'Transaction not found' });
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'tx-1', userId: 'user-1' },
    });
  });

  it('adds tags and sets category for a transaction', async () => {
    const tx = {
      id: 'tx-2',
      userId: 'user-1',
      tags: ['food'],
      category: null,
      createdAt: new Date(),
    } as any;

    mockRepository.findOne.mockResolvedValue(tx);
    mockRepository.save.mockImplementation(async (t) => t);

    const payload = { tags: ['groceries'], category: 'Groceries' };

    const res = await service.tagTransaction('user-1', 'tx-2', payload);

    expect(res.ok).toBe(true);
    expect(res.transaction).toBeDefined();
    // narrow the type for TS strict checks
    const t = res.transaction!;
    expect(t.tags).toEqual(expect.arrayContaining(['food', 'groceries']));
    expect(t.category).toBe('Groceries');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('bulkTag returns error when no ids provided', async () => {
    const res = await service.bulkTag('user-1', { ids: [] });
    expect(res).toEqual({ ok: false, message: 'No ids provided' });
  });

  it('bulkTag updates multiple transactions and returns count', async () => {
    const txs = [
      { id: 'a', userId: 'user-1', tags: ['x'], category: null },
      { id: 'b', userId: 'user-1', tags: [], category: null },
    ];

    mockRepository.findBy.mockResolvedValue(txs);
    mockRepository.save.mockImplementation(async (items) => items);

    const res = await service.bulkTag('user-1', {
      ids: ['a', 'b'],
      tags: ['new'],
      action: 'add',
    });

    expect(res.ok).toBe(true);
    expect(res.count).toBe(2);
    expect(mockRepository.save).toHaveBeenCalledWith(txs);
    // ensure tags updated
    expect(txs[0].tags).toEqual(expect.arrayContaining(['x', 'new']));
    expect(txs[1].tags).toEqual(expect.arrayContaining(['new']));
  });

  it('listCategories returns distinct categories', async () => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ category: 'A' }, { category: 'B' }]),
    };

    mockRepository.createQueryBuilder.mockReturnValue(qb);

    const res = await service.listCategories('user-1');

    expect(res).toEqual(['A', 'B']);
    expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
      'transaction',
    );
  });
});
