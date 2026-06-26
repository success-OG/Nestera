import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadgesService } from './badges.service';
import { Badge, BadgeCategory, BadgeTier } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../user/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('BadgesService', () => {
  let service: BadgesService;
  let badgeRepository: Repository<Badge>;
  let userBadgeRepository: Repository<UserBadge>;
  let userRepository: Repository<User>;
  let eventEmitter: EventEmitter2;

  const mockBadge: Partial<Badge> = {
    id: 'badge-1',
    code: 'first_deposit',
    name: 'First Saver',
    description: 'Made your first deposit',
    category: BadgeCategory.SAVINGS,
    tier: BadgeTier.BRONZE,
    icon: 'first-deposit',
    color: '#CD7F32',
    points: 50,
    active: true,
    criteria: { type: 'first_deposit' },
  };

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserBadge: Partial<UserBadge> = {
    id: 'user-badge-1',
    userId: 'user-1',
    badgeId: 'badge-1',
    earnedAt: new Date(),
    shared: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgesService,
        {
          provide: getRepositoryToken(Badge),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserBadge),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BadgesService>(BadgesService);
    badgeRepository = module.get<Repository<Badge>>(getRepositoryToken(Badge));
    userBadgeRepository = module.get<Repository<UserBadge>>(
      getRepositoryToken(UserBadge),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.spyOn(badgeRepository, 'save').mockResolvedValue(mockBadge as Badge);
    jest
      .spyOn(userBadgeRepository, 'save')
      .mockResolvedValue(mockUserBadge as UserBadge);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeDefaultBadges', () => {
    it('should initialize default badges when none exist', async () => {
      jest.spyOn(badgeRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(badgeRepository, 'save')
        .mockResolvedValue([mockBadge as Badge] as any);

      await service.initializeDefaultBadges();

      expect(badgeRepository.find).toHaveBeenCalled();
      expect(badgeRepository.save).toHaveBeenCalled();
    });

    it('should skip initialization when badges already exist', async () => {
      jest
        .spyOn(badgeRepository, 'find')
        .mockResolvedValue([mockBadge as Badge]);

      await service.initializeDefaultBadges();

      expect(badgeRepository.find).toHaveBeenCalled();
      expect(badgeRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('awardBadge', () => {
    it('should award a badge to a user', async () => {
      jest
        .spyOn(badgeRepository, 'findOne')
        .mockResolvedValue(mockBadge as Badge);
      jest.spyOn(userBadgeRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(userBadgeRepository, 'create')
        .mockReturnValue(mockUserBadge as UserBadge);
      jest
        .spyOn(userBadgeRepository, 'save')
        .mockResolvedValue(mockUserBadge as UserBadge);

      const result = await service.awardBadge('user-1', 'badge-1');

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'badge.earned',
        expect.objectContaining({
          userId: 'user-1',
          badgeId: 'badge-1',
        }),
      );
    });

    it('should not award duplicate badge', async () => {
      jest
        .spyOn(badgeRepository, 'findOne')
        .mockResolvedValue(mockBadge as Badge);
      jest
        .spyOn(userBadgeRepository, 'findOne')
        .mockResolvedValue(mockUserBadge as UserBadge);

      const result = await service.awardBadge('user-1', 'badge-1');

      expect(result).toEqual(mockUserBadge);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if badge does not exist', async () => {
      jest.spyOn(badgeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.awardBadge('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkMilestoneBadge', () => {
    it('should award milestone badge when percentage matches', async () => {
      jest
        .spyOn(badgeRepository, 'findOne')
        .mockResolvedValue(mockBadge as Badge);
      jest.spyOn(userBadgeRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(service, 'awardBadge')
        .mockResolvedValue(mockUserBadge as UserBadge);

      await service.checkMilestoneBadge('user-1', 'goal-1', 25, 'Test Goal');

      expect(service.awardBadge).toHaveBeenCalledWith(
        'user-1',
        'badge-1',
        expect.any(Object),
      );
    });

    it('should skip if badge already earned', async () => {
      jest
        .spyOn(badgeRepository, 'findOne')
        .mockResolvedValue(mockBadge as Badge);
      jest
        .spyOn(userBadgeRepository, 'findOne')
        .mockResolvedValue(mockUserBadge as UserBadge);
      const awardBadgeSpy = jest.spyOn(service, 'awardBadge');

      await service.checkMilestoneBadge('user-1', 'goal-1', 25, 'Test Goal');

      expect(awardBadgeSpy).not.toHaveBeenCalled();
    });
  });

  describe('getUserBadges', () => {
    it('should return user badges with relations', async () => {
      const userBadgesWithRelations = {
        ...mockUserBadge,
        badge: mockBadge,
      };

      jest
        .spyOn(userBadgeRepository, 'find')
        .mockResolvedValue([userBadgesWithRelations as any]);

      const result = await service.getUserBadges('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].badge).toBeDefined();
    });
  });

  describe('getBadgeStats', () => {
    it('should return badge statistics', async () => {
      const userBadgesWithRelations = {
        ...mockUserBadge,
        badge: mockBadge,
      };

      jest
        .spyOn(userBadgeRepository, 'find')
        .mockResolvedValue([userBadgesWithRelations as any]);
      jest.spyOn(badgeRepository, 'count').mockResolvedValue(10);

      const result = await service.getBadgeStats('user-1');

      expect(result.totalBadges).toBe(10);
      expect(result.earnedBadges).toBe(1);
      expect(result.totalPoints).toBe(50);
      expect(result.categoryBreakdown).toBeDefined();
    });
  });

  describe('generateShareToken', () => {
    it('should generate share token for badge', async () => {
      const userBadgeWithRelations = {
        ...mockUserBadge,
        badge: mockBadge,
        shareToken: null,
      };

      jest
        .spyOn(userBadgeRepository, 'findOne')
        .mockResolvedValue(userBadgeWithRelations as any);
      jest
        .spyOn(userBadgeRepository, 'save')
        .mockResolvedValue(userBadgeWithRelations as any);

      const result = await service.generateShareToken('user-1', 'user-badge-1');

      expect(result).toBeDefined();
      expect(userBadgeRepository.save).toHaveBeenCalled();
    });

    it('should return existing share token if already generated', async () => {
      const userBadgeWithRelations = {
        ...mockUserBadge,
        badge: mockBadge,
        shareToken: 'existing-token',
      };

      jest
        .spyOn(userBadgeRepository, 'findOne')
        .mockResolvedValue(userBadgeWithRelations as any);

      const result = await service.generateShareToken('user-1', 'user-badge-1');

      expect(result).toBe('existing-token');
      expect(userBadgeRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getSharedBadge', () => {
    it('should return shared badge by token', async () => {
      const userBadgeWithRelations = {
        ...mockUserBadge,
        badge: mockBadge,
        user: mockUser,
        shareToken: 'test-token',
      };

      jest
        .spyOn(userBadgeRepository, 'findOne')
        .mockResolvedValue(userBadgeWithRelations as any);

      const result = await service.getSharedBadge('test-token');

      expect(result).toBeDefined();
      expect(result.badge).toBeDefined();
    });

    it('should throw NotFoundException if token not found', async () => {
      jest.spyOn(userBadgeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSharedBadge('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
