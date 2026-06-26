import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

describe('WaitlistController', () => {
  let controller: WaitlistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [
        {
          provide: WaitlistService,
          useValue: {
            joinWaitlist: jest
              .fn()
              .mockResolvedValue({ entry: { id: '1' }, position: 1 }),
            getUserEntry: jest.fn().mockResolvedValue({ id: '1' }),
            getPosition: jest.fn().mockResolvedValue(1),
            leaveWaitlist: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<WaitlistController>(WaitlistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get position', async () => {
    const res = await controller.getPosition('productId', { id: 'userId' });
    expect(res).toEqual({ id: '1', position: 1, status: 'PENDING' });
  });

  it('should leave waitlist', async () => {
    await controller.leaveWaitlist('productId', { id: 'userId' });
    expect(controller).toBeDefined();
  });
});
