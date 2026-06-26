import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoalTransferService } from './goal-transfer.service';
import {
  GoalTransferSchedule,
  GoalTransferExecution,
  GoalTransferFrequency,
  GoalTransferStatus,
} from '../entities/goal-transfer-schedule.entity';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../entities/savings-goal.entity';
import { User } from '../../user/entities/user.entity';
import { SavingsService } from '../savings.service';
import { MailService } from '../../mail/mail.service';

const mockRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('GoalTransferService', () => {
  let service: GoalTransferService;
  let scheduleRepo: ReturnType<typeof mockRepo>;
  let goalRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;
  let savingsService: { transferToGoal: jest.Mock; findOneProduct: jest.Mock };

  beforeEach(async () => {
    scheduleRepo = mockRepo();
    goalRepo = mockRepo();
    userRepo = mockRepo();
    savingsService = {
      transferToGoal: jest.fn(),
      findOneProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalTransferService,
        {
          provide: getRepositoryToken(GoalTransferSchedule),
          useValue: scheduleRepo,
        },
        {
          provide: getRepositoryToken(GoalTransferExecution),
          useValue: mockRepo(),
        },
        { provide: getRepositoryToken(SavingsGoal), useValue: goalRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: SavingsService, useValue: savingsService },
        {
          provide: MailService,
          useValue: { sendSavingsAlertEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GoalTransferService>(GoalTransferService);
  });

  describe('create', () => {
    it('creates schedule when validation passes', async () => {
      const dto = {
        goalId: 'goal-1',
        amount: 25,
        frequency: GoalTransferFrequency.WEEKLY,
      };
      goalRepo.findOne.mockResolvedValue({
        id: 'goal-1',
        status: SavingsGoalStatus.IN_PROGRESS,
      });
      scheduleRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({ defaultSavingsProductId: 'prod-1' });
      scheduleRepo.save.mockResolvedValue({ id: 'sched-1', ...dto });

      const result = await service.create('user-1', dto);
      expect(result.id).toBe('sched-1');
    });

    it('rejects duplicate active schedule', async () => {
      goalRepo.findOne.mockResolvedValue({
        id: 'goal-1',
        status: SavingsGoalStatus.IN_PROGRESS,
      });
      scheduleRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('user-1', {
          goalId: 'goal-1',
          amount: 10,
          frequency: GoalTransferFrequency.DAILY,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pause', () => {
    it('pauses active schedule', async () => {
      scheduleRepo.findOne.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: GoalTransferStatus.ACTIVE,
      });
      scheduleRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.pause('s1', 'u1');
      expect(result.status).toBe(GoalTransferStatus.PAUSED);
    });

    it('throws when not found', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);
      await expect(service.pause('bad', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('computeNextRun', () => {
    it('adds 7 days for WEEKLY', () => {
      const from = new Date('2026-01-01T00:00:00Z');
      const next = service.computeNextRun(GoalTransferFrequency.WEEKLY, from);
      expect(next.getDate()).toBe(8);
    });
  });
});
