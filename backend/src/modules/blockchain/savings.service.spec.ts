import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SavingsService } from './savings.service';
import { StellarService } from './stellar.service';

// Requirements: 7.1, 7.2, 7.3

const MOCK_PUBLIC_KEY =
  'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

function buildAccountMock(nativeBalance: string) {
  return {
    balances: [{ balance: nativeBalance, asset_type: 'native' }],
  };
}

async function buildModule(
  cacheGetImpl: jest.Mock,
  cacheSetImpl: jest.Mock,
  horizonCallImpl: jest.Mock,
): Promise<SavingsService> {
  const mockCacheManager = {
    get: cacheGetImpl,
    set: cacheSetImpl,
  };

  const mockHorizonServer = {
    accounts: jest.fn().mockReturnValue({
      accountId: jest.fn().mockReturnValue({
        call: horizonCallImpl,
      }),
    }),
  };

  const mockStellarService = {
    getHorizonServer: jest.fn().mockReturnValue(mockHorizonServer),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SavingsService,
      { provide: StellarService, useValue: mockStellarService },
      { provide: CACHE_MANAGER, useValue: mockCacheManager },
    ],
  }).compile();

  return module.get<SavingsService>(SavingsService);
}

describe('SavingsService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getWalletBalance()', () => {
    it('returns cached value without calling Horizon on cache hit', async () => {
      const cachedPayload = JSON.stringify({
        balance: '100.0000000',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      const cacheGet = jest.fn().mockResolvedValue(cachedPayload);
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const horizonCall = jest.fn();

      const service = await buildModule(cacheGet, cacheSet, horizonCall);
      const result = await service.getWalletBalance(MOCK_PUBLIC_KEY, 'native');

      expect(result).toBe(1_000_000_000); // 100 XLM * 10_000_000
      expect(horizonCall).not.toHaveBeenCalled();
    });

    it('calls Horizon and populates cache on cache miss', async () => {
      const cacheGet = jest.fn().mockResolvedValue(null);
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const horizonCall = jest
        .fn()
        .mockResolvedValue(buildAccountMock('50.0000000'));

      const service = await buildModule(cacheGet, cacheSet, horizonCall);
      const result = await service.getWalletBalance(MOCK_PUBLIC_KEY, 'native');

      expect(result).toBe(500_000_000); // 50 XLM * 10_000_000
      expect(horizonCall).toHaveBeenCalledTimes(1);
      expect(cacheSet).toHaveBeenCalledWith(
        `balance:${MOCK_PUBLIC_KEY}:native`,
        expect.stringContaining('"balance":"50.0000000"'),
        300_000,
      );
    });
  });

  describe('getUserSavingsBalance()', () => {
    it('returns cached native balance without calling Horizon on cache hit', async () => {
      const cachedPayload = JSON.stringify({
        balance: '200.0000000',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      const cacheGet = jest.fn().mockResolvedValue(cachedPayload);
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const horizonCall = jest.fn();

      const service = await buildModule(cacheGet, cacheSet, horizonCall);
      const result = await service.getUserSavingsBalance(MOCK_PUBLIC_KEY);

      expect(result.flexible).toBe(2_000_000_000); // 200 XLM * 10_000_000
      expect(result.locked).toBe(0);
      expect(result.total).toBe(2_000_000_000);
      expect(horizonCall).not.toHaveBeenCalled();
    });

    it('falls through to Horizon on cache miss', async () => {
      const cacheGet = jest.fn().mockResolvedValue(null);
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const horizonCall = jest
        .fn()
        .mockResolvedValue(buildAccountMock('10.0000000'));

      const service = await buildModule(cacheGet, cacheSet, horizonCall);
      const result = await service.getUserSavingsBalance(MOCK_PUBLIC_KEY);

      expect(horizonCall).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ flexible: 0, locked: 0, total: 0 });
    });
  });
});
