import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { WaitlistEvent } from './entities/waitlist-event.entity';
import { SavingsProduct } from './entities/savings-product.entity';
import { User } from '../user/entities/user.entity';

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: getRepositoryToken(WaitlistEntry),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue({ id: 'entry1' }),
            })),
          },
        },
        {
          provide: getRepositoryToken(SavingsProduct),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WaitlistEvent),
          useValue: {
            findOne: jest
              .fn()
              .mockResolvedValue({ id: 'event1', entryId: 'entry1' }),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call leaveWaitlist successfully', async () => {
    await service.leaveWaitlist('userId', 'productId');
    expect(service).toBeDefined(); // Just ensure it resolves without error
  });

  it('should record conversion', async () => {
    await service.recordConversion('userId', 'productId');
    expect(service).toBeDefined();
  });
});
