import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { WebhookService } from './webhook.service';
import {
  WebhookSubscription,
  WebhookStatus,
} from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  DeliveryStatus,
} from './entities/webhook-delivery.entity';

const mockSubRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

const mockDeliveryRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockHttpService = () => ({
  post: jest.fn(),
});

describe('WebhookService', () => {
  let service: WebhookService;
  let subRepo: ReturnType<typeof mockSubRepo>;
  let deliveryRepo: ReturnType<typeof mockDeliveryRepo>;
  let httpService: ReturnType<typeof mockHttpService>;

  const userId = 'user-uuid-1';
  const subId = 'sub-uuid-1';

  const baseSub = (): WebhookSubscription => ({
    id: subId,
    userId,
    url: 'https://example.com/hooks',
    secret: 'test-secret-key',
    events: ['savings.deposit'],
    status: WebhookStatus.ACTIVE,
    description: null,
    deliveries: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(WebhookSubscription),
          useFactory: mockSubRepo,
        },
        {
          provide: getRepositoryToken(WebhookDelivery),
          useFactory: mockDeliveryRepo,
        },
        { provide: HttpService, useFactory: mockHttpService },
      ],
    }).compile();

    service = module.get(WebhookService);
    subRepo = module.get(getRepositoryToken(WebhookSubscription));
    deliveryRepo = module.get(getRepositoryToken(WebhookDelivery));
    httpService = module.get(HttpService);
  });

  describe('register', () => {
    it('creates a subscription with a generated secret when none provided', async () => {
      const dto = {
        url: 'https://example.com/hooks',
        events: ['savings.deposit'],
      };
      const sub = baseSub();
      subRepo.create.mockReturnValue(sub);
      subRepo.save.mockResolvedValue(sub);

      const result = await service.register(userId, dto);

      expect(subRepo.create).toHaveBeenCalled();
      expect(result).toEqual(sub);
    });

    it('uses provided secret if given', async () => {
      const dto = {
        url: 'https://example.com/hooks',
        events: ['*'],
        secret: 'my-secret-key',
      };
      const sub = { ...baseSub(), secret: 'my-secret-key' };
      subRepo.create.mockReturnValue(sub);
      subRepo.save.mockResolvedValue(sub);

      const result = await service.register(userId, dto);
      expect(result.secret).toBe('my-secret-key');
    });
  });

  describe('findOne', () => {
    it('returns the subscription for the owner', async () => {
      subRepo.findOne.mockResolvedValue(baseSub());
      const result = await service.findOne(subId, userId);
      expect(result.id).toBe(subId);
    });

    it('throws NotFoundException when not found', async () => {
      subRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(subId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for wrong owner', async () => {
      subRepo.findOne.mockResolvedValue(baseSub());
      await expect(service.findOne(subId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('disable / enable', () => {
    it('disables a subscription', async () => {
      const sub = baseSub();
      subRepo.findOne.mockResolvedValue(sub);
      subRepo.save.mockResolvedValue({
        ...sub,
        status: WebhookStatus.DISABLED,
      });

      const result = await service.disable(subId, userId);
      expect(result.status).toBe(WebhookStatus.DISABLED);
    });

    it('enables a disabled subscription', async () => {
      const sub = { ...baseSub(), status: WebhookStatus.DISABLED };
      subRepo.findOne.mockResolvedValue(sub);
      subRepo.save.mockResolvedValue({ ...sub, status: WebhookStatus.ACTIVE });

      const result = await service.enable(subId, userId);
      expect(result.status).toBe(WebhookStatus.ACTIVE);
    });
  });

  describe('sign / verifySignature', () => {
    it('produces a consistent HMAC and verifies it', () => {
      const body = '{"event":"test"}';
      const secret = 'my-secret';
      const sig = `sha256=${service.sign(body, secret)}`;
      expect(service.verifySignature(body, secret, sig)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      expect(service.verifySignature('body', 'secret', 'sha256=badhex00')).toBe(
        false,
      );
    });
  });

  describe('dispatch', () => {
    it('fans out to matching active subscriptions', async () => {
      const sub = baseSub();
      subRepo.find.mockResolvedValue([sub]);
      const delivery = {
        id: 'd1',
        attempts: 0,
        nextRetryAt: null,
      } as WebhookDelivery;
      deliveryRepo.create.mockReturnValue(delivery);
      deliveryRepo.save.mockResolvedValue(delivery);
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      await service.dispatch('savings.deposit', { amount: 100 });

      expect(deliveryRepo.save).toHaveBeenCalled();
    });

    it('does not dispatch to inactive subscriptions', async () => {
      subRepo.find.mockResolvedValue([]);

      await service.dispatch('savings.deposit', {});

      expect(deliveryRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('attempt', () => {
    it('marks delivery SUCCESS on 2xx response', async () => {
      const sub = baseSub();
      const delivery = {
        id: 'd1',
        subscriptionId: subId,
        eventName: 'savings.deposit',
        payload: {},
        attempts: 0,
        nextRetryAt: null,
        status: DeliveryStatus.PENDING,
      } as WebhookDelivery;

      subRepo.findOne.mockResolvedValue(sub);
      deliveryRepo.save.mockResolvedValue(delivery);
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      await service.attempt(delivery, sub);

      expect(delivery.status).toBe(DeliveryStatus.SUCCESS);
    });

    it('schedules retry on non-2xx response', async () => {
      const sub = baseSub();
      const delivery = {
        id: 'd1',
        subscriptionId: subId,
        eventName: 'savings.deposit',
        payload: {},
        attempts: 0,
        nextRetryAt: null,
        status: DeliveryStatus.PENDING,
      } as WebhookDelivery;

      subRepo.findOne.mockResolvedValue(sub);
      deliveryRepo.save.mockResolvedValue(delivery);
      httpService.post.mockReturnValue(of({ status: 500, data: 'error' }));

      await service.attempt(delivery, sub);

      expect(delivery.status).toBe(DeliveryStatus.PENDING);
      expect(delivery.nextRetryAt).not.toBeNull();
    });
  });

  describe('retryDue', () => {
    it('picks up pending deliveries past their nextRetryAt', async () => {
      const delivery = {
        id: 'd1',
        subscriptionId: subId,
        attempts: 1,
        nextRetryAt: new Date(Date.now() - 1000),
        status: DeliveryStatus.PENDING,
      } as WebhookDelivery;
      deliveryRepo.find.mockResolvedValue([delivery]);
      subRepo.findOne.mockResolvedValue(baseSub());
      deliveryRepo.save.mockResolvedValue(delivery);
      httpService.post.mockReturnValue(of({ status: 200, data: 'ok' }));

      await service.retryDue();

      expect(deliveryRepo.find).toHaveBeenCalled();
    });
  });
});
