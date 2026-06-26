import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminSavingsService } from './admin-savings.service';
import {
  SavingsProduct,
  SavingsProductType,
  RiskLevel,
} from '../savings/entities/savings-product.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { SavingsService as BlockchainSavingsService } from '../blockchain/savings.service';

const mockProduct = (overrides: Partial<SavingsProduct> = {}): SavingsProduct =>
  ({
    id: 'prod-1',
    name: 'Test Plan',
    type: SavingsProductType.FIXED,
    interestRate: 8,
    minAmount: 100,
    maxAmount: 10000,
    tenureMonths: 12,
    isActive: true,
    contractId: null,
    tvlAmount: 0,
    riskLevel: RiskLevel.LOW,
    capacity: null,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [],
    ...overrides,
  }) as SavingsProduct;

describe('AdminSavingsService', () => {
  let service: AdminSavingsService;
  let productRepo: any;
  let subRepo: any;
  let blockchainSavings: any;

  beforeEach(async () => {
    productRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest
        .fn()
        .mockImplementation((p) => Promise.resolve({ ...mockProduct(), ...p })),
      findOne: jest.fn().mockResolvedValue(mockProduct()),
      update: jest.fn().mockResolvedValue({}),
    };
    subRepo = {
      count: jest.fn().mockResolvedValue(0),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    blockchainSavings = {
      getVaultTotalAssets: jest.fn().mockResolvedValue(5_000_000_000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSavingsService,
        { provide: getRepositoryToken(SavingsProduct), useValue: productRepo },
        { provide: getRepositoryToken(UserSubscription), useValue: subRepo },
        { provide: BlockchainSavingsService, useValue: blockchainSavings },
      ],
    }).compile();

    service = module.get(AdminSavingsService);
  });

  describe('createProduct', () => {
    it('creates and returns a product', async () => {
      const dto = {
        name: 'Plan A',
        type: SavingsProductType.FIXED,
        interestRate: 5,
        minAmount: 100,
        maxAmount: 5000,
        tenureMonths: 6,
      };
      const result = await service.createProduct(dto);
      expect(productRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Plan A');
    });

    it('throws when minAmount > maxAmount', async () => {
      await expect(
        service.createProduct({
          interestRate: 5,
          minAmount: 5000,
          maxAmount: 100,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when interestRate > 100', async () => {
      await expect(
        service.createProduct({
          interestRate: 150,
          minAmount: 100,
          maxAmount: 1000,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('syncs with contract when contractId is set', async () => {
      productRepo.save.mockResolvedValue(
        mockProduct({ contractId: 'CONTRACT123' }),
      );
      await service.createProduct({
        interestRate: 5,
        minAmount: 100,
        maxAmount: 1000,
      } as any);
      expect(blockchainSavings.getVaultTotalAssets).toHaveBeenCalledWith(
        'CONTRACT123',
      );
    });
  });

  describe('updateProduct', () => {
    it('updates product fields', async () => {
      const result = await service.updateProduct('prod-1', {
        name: 'Updated',
      });
      expect(productRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException for unknown product', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.updateProduct('bad-id', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates updated min/max amounts', async () => {
      await expect(
        service.updateProduct('prod-1', {
          minAmount: 9000,
          maxAmount: 100,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('archiveProduct', () => {
    it('archives a product with no active subscriptions', async () => {
      subRepo.count.mockResolvedValue(0);
      const result = await service.archiveProduct('prod-1');
      expect(result).toEqual({ id: 'prod-1', archived: true });
    });

    it('throws when product has active subscriptions', async () => {
      subRepo.count.mockResolvedValue(3);
      await expect(service.archiveProduct('prod-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException for unknown product', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.archiveProduct('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setActive', () => {
    it('activates a product', async () => {
      await service.setActive('prod-1', true);
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('deactivates a product', async () => {
      await service.setActive('prod-1', false);
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe('getSubscribers', () => {
    it('returns paginated subscribers', async () => {
      subRepo.findAndCount.mockResolvedValue([[{ id: 'sub-1' }], 1]);
      const result = await service.getSubscribers('prod-1', {
        page: 1,
        limit: 10,
        skip: 0,
      });
      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('throws NotFoundException for unknown product', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getSubscribers('bad-id', {
          page: 1,
          limit: 10,
          skip: 0,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
