import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MilestoneService } from './milestone.service';
import {
  SavingsGoalMilestone,
  MilestoneType,
} from '../entities/savings-goal-milestone.entity';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../entities/savings-goal.entity';

const mockGoal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  goalName: 'Test Goal',
  targetAmount: 1000,
  targetDate: new Date('2027-01-01'),
  status: SavingsGoalStatus.IN_PROGRESS,
  metadata: null,
  milestonesSent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: null as any,
};

describe('MilestoneService', () => {
  let service: MilestoneService;
  let milestoneRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let goalRepo: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    milestoneRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn((v) =>
        Array.isArray(v) ? Promise.resolve(v) : Promise.resolve(v),
      ),
    };

    goalRepo = { findOne: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneService,
        {
          provide: getRepositoryToken(SavingsGoalMilestone),
          useValue: milestoneRepo,
        },
        { provide: getRepositoryToken(SavingsGoal), useValue: goalRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MilestoneService>(MilestoneService);
  });

  describe('initializeAutomaticMilestones', () => {
    it('creates all 4 automatic milestones when none exist', async () => {
      milestoneRepo.find.mockResolvedValue([]);
      milestoneRepo.save.mockResolvedValue([]);

      await service.initializeAutomaticMilestones('goal-1', 'user-1');

      expect(milestoneRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ percentage: 25 }),
          expect.objectContaining({ percentage: 50 }),
          expect.objectContaining({ percentage: 75 }),
          expect.objectContaining({ percentage: 100 }),
        ]),
      );
    });

    it('skips milestones that already exist', async () => {
      milestoneRepo.find.mockResolvedValue([
        { percentage: 25, type: MilestoneType.AUTOMATIC },
        { percentage: 50, type: MilestoneType.AUTOMATIC },
      ]);
      milestoneRepo.save.mockResolvedValue([]);

      await service.initializeAutomaticMilestones('goal-1', 'user-1');

      const saved = milestoneRepo.save.mock.calls[0][0];
      expect(saved).toHaveLength(2);
      expect(saved.map((m: any) => m.percentage)).toEqual([75, 100]);
    });
  });

  describe('detectAndAchieveMilestones', () => {
    it('marks milestones as achieved when percentage is reached', async () => {
      const unachieved = [
        {
          id: 'm-1',
          percentage: 25,
          achieved: false,
          bonusPoints: 50,
          label: '25% reached',
        },
        {
          id: 'm-2',
          percentage: 50,
          achieved: false,
          bonusPoints: 100,
          label: '50% reached',
        },
        {
          id: 'm-3',
          percentage: 75,
          achieved: false,
          bonusPoints: 150,
          label: '75% reached',
        },
      ];
      milestoneRepo.find.mockResolvedValue(unachieved);
      milestoneRepo.save.mockImplementation((items) => Promise.resolve(items));

      const result = await service.detectAndAchieveMilestones(
        'goal-1',
        'user-1',
        60,
      );

      expect(result).toHaveLength(2); // 25% and 50% achieved
      expect(eventEmitter.emit).toHaveBeenCalledTimes(4); // milestone.achieved + goal.milestone per milestone
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'milestone.achieved',
        expect.objectContaining({ percentage: 25 }),
      );
    });

    it('returns empty array when no milestones are crossed', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm-1', percentage: 50, achieved: false },
      ]);

      const result = await service.detectAndAchieveMilestones(
        'goal-1',
        'user-1',
        30,
      );

      expect(result).toHaveLength(0);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('getMilestones', () => {
    it('returns milestones ordered by percentage', async () => {
      goalRepo.findOne.mockResolvedValue(mockGoal);
      const milestones = [
        { id: 'm-1', percentage: 25 },
        { id: 'm-2', percentage: 50 },
      ];
      milestoneRepo.find.mockResolvedValue(milestones);

      const result = await service.getMilestones('goal-1', 'user-1');

      expect(result).toEqual(milestones);
    });

    it('throws NotFoundException when goal does not belong to user', async () => {
      goalRepo.findOne.mockResolvedValue(null);

      await expect(service.getMilestones('goal-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addCustomMilestone', () => {
    it('creates a custom milestone', async () => {
      goalRepo.findOne.mockResolvedValue(mockGoal);
      milestoneRepo.findOne.mockResolvedValue(null);
      const created = {
        id: 'm-custom',
        goalId: 'goal-1',
        userId: 'user-1',
        percentage: 33,
        label: 'One third!',
        type: MilestoneType.CUSTOM,
        achieved: false,
        achievedAt: null,
        bonusPoints: 0,
      };
      milestoneRepo.save.mockResolvedValue(created);

      const result = await service.addCustomMilestone(
        'goal-1',
        'user-1',
        33,
        'One third!',
      );

      expect(result).toEqual(created);
    });

    it('throws BadRequestException when percentage already exists', async () => {
      goalRepo.findOne.mockResolvedValue(mockGoal);
      milestoneRepo.findOne.mockResolvedValue({
        id: 'existing',
        percentage: 33,
      });

      await expect(
        service.addCustomMilestone('goal-1', 'user-1', 33, 'Duplicate'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
