import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { SavingsGoalSharingService } from './savings-goal-sharing.service';
import { SavingsGoal, SavingsGoalStatus } from './entities/savings-goal.entity';
import {
  SavingsGoalShare,
  SavingsGoalShareVisibility,
} from './entities/savings-goal-share.entity';
import {
  SavingsGoalShareEvent,
  SavingsGoalShareEventType,
} from './entities/savings-goal-share-event.entity';
import { SavingsService } from './savings.service';

const goal = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  goalName: 'Emergency fund',
  targetAmount: 5000,
  targetDate: new Date('2027-01-01'),
  status: SavingsGoalStatus.IN_PROGRESS,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as SavingsGoal;

const owner = {
  id: goal.userId,
  name: 'Ada',
};

function createShare(overrides: Partial<SavingsGoalShare> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    goalId: goal.id,
    ownerId: owner.id,
    visibility: SavingsGoalShareVisibility.PUBLIC,
    shareToken: 'share-token',
    expiresAt: null,
    revokedAt: null,
    isDirectoryListed: false,
    showProgress: true,
    showTargetAmount: false,
    showOwnerName: true,
    allowSocialSharing: true,
    allowProgressUpdates: true,
    allowedUserIds: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    goal,
    owner,
    ...overrides,
  } as SavingsGoalShare;
}

describe('SavingsGoalSharingService', () => {
  let service: SavingsGoalSharingService;
  let goalRepository: { findOne: jest.Mock };
  let shareRepository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let eventRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    goalRepository = {
      findOne: jest.fn().mockResolvedValue(goal),
    };
    shareRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: value.id ?? '33333333-3333-4333-8333-333333333333',
        createdAt: value.createdAt ?? new Date(),
        updatedAt: new Date(),
        ...value,
      })),
    };
    eventRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingsGoalSharingService,
        {
          provide: getRepositoryToken(SavingsGoal),
          useValue: goalRepository,
        },
        {
          provide: getRepositoryToken(SavingsGoalShare),
          useValue: shareRepository,
        },
        {
          provide: getRepositoryToken(SavingsGoalShareEvent),
          useValue: eventRepository,
        },
        {
          provide: SavingsService,
          useValue: {
            findMyGoals: jest.fn().mockResolvedValue([
              {
                ...goal,
                targetAmount: 5000,
                currentBalance: 1500,
                percentageComplete: 30,
                projectedBalance: 5200,
                isOffTrack: false,
                projectionGap: 0,
                appliedYieldRate: 4.5,
              },
            ]),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'PUBLIC_APP_URL' ? 'https://app.nestera.test' : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(SavingsGoalSharingService);
  });

  it('creates public sharing settings with directory listing', async () => {
    shareRepository.findOne.mockResolvedValue(null);

    const result = await service.upsertSharing(goal.id, owner.id, {
      visibility: SavingsGoalShareVisibility.PUBLIC,
      isDirectoryListed: true,
      showTargetAmount: true,
    });

    expect(result.visibility).toBe(SavingsGoalShareVisibility.PUBLIC);
    expect(result.isDirectoryListed).toBe(true);
    expect(result.showTargetAmount).toBe(true);
    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SavingsGoalShareEventType.PERMISSION_UPDATED,
      }),
    );
  });

  it('blocks directory listing for non-public shares', async () => {
    await expect(
      service.upsertSharing(goal.id, owner.id, {
        visibility: SavingsGoalShareVisibility.FRIENDS,
        isDirectoryListed: true,
      }),
    ).rejects.toThrow('Only public goals can be listed');
  });

  it('creates a shareable link and returns the public URL', async () => {
    shareRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.createShareLink(goal.id, owner.id);

    expect(result.share.shareToken).toEqual(expect.any(String));
    expect(result.shareUrl).toContain('https://app.nestera.test/goals/shared/');
    expect(result.share.visibility).toBe(SavingsGoalShareVisibility.UNLISTED);
  });

  it('returns a redacted shared goal and records views', async () => {
    shareRepository.findOne.mockResolvedValue(
      createShare({ showTargetAmount: false }),
    );

    const result = await service.getSharedGoalByToken('share-token');

    expect(result.goal.targetAmount).toBeUndefined();
    expect(result.goal.percentageComplete).toBe(30);
    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SavingsGoalShareEventType.VIEW,
      }),
    );
  });

  it('denies friend-only shares to users outside the allow list', async () => {
    shareRepository.findOne.mockResolvedValue(
      createShare({
        visibility: SavingsGoalShareVisibility.FRIENDS,
        allowedUserIds: ['44444444-4444-4444-8444-444444444444'],
      }),
    );

    await expect(
      service.getSharedGoalByToken(
        'share-token',
        '55555555-5555-4555-8555-555555555555',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('builds social share intents and aggregates analytics', async () => {
    shareRepository.findOne.mockResolvedValue(createShare());
    eventRepository.find.mockResolvedValue([
      {
        eventType: SavingsGoalShareEventType.VIEW,
        viewerId: null,
        platform: null,
      },
      {
        eventType: SavingsGoalShareEventType.SOCIAL_SHARE,
        viewerId: owner.id,
        platform: 'x',
      },
    ]);

    const social = await service.createSocialShare(goal.id, owner.id, {
      platform: 'x',
    });
    const analytics = await service.getAnalytics(goal.id, owner.id);

    expect(social.intentUrl).toContain('twitter.com/intent/tweet');
    expect(analytics.totalViews).toBe(1);
    expect(analytics.socialShares).toBe(1);
    expect(analytics.byPlatform.x).toBe(1);
  });
});
