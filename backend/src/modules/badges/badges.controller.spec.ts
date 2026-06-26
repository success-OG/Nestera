import { Test, TestingModule } from '@nestjs/testing';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeDto, UserBadgeDto, BadgeStatsDto } from './dto/badge.dto';
import { BadgeCategory, BadgeTier } from './entities/badge.entity';

describe('BadgesController', () => {
  let controller: BadgesController;
  let service: BadgesService;

  const mockBadgeDto: BadgeDto = {
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
    earned: true,
  };

  const mockUserBadgeDto: UserBadgeDto = {
    id: 'user-badge-1',
    badge: mockBadgeDto,
    earnedAt: new Date(),
    shared: false,
  };

  const mockBadgeStats: BadgeStatsDto = {
    totalBadges: 10,
    earnedBadges: 3,
    totalPoints: 150,
    recentBadges: [mockUserBadgeDto],
    categoryBreakdown: {
      [BadgeCategory.SAVINGS]: 2,
      [BadgeCategory.STREAK]: 1,
      [BadgeCategory.GOAL]: 0,
      [BadgeCategory.SOCIAL]: 0,
    },
  };

  const mockRequest = {
    user: {
      userId: 'user-1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgesController],
      providers: [
        {
          provide: BadgesService,
          useValue: {
            getAvailableBadges: jest.fn().mockResolvedValue([mockBadgeDto]),
            getUserBadges: jest.fn().mockResolvedValue([mockUserBadgeDto]),
            getBadgeStats: jest.fn().mockResolvedValue(mockBadgeStats),
            generateShareToken: jest.fn().mockResolvedValue('share-token-123'),
            getSharedBadge: jest.fn().mockResolvedValue(mockUserBadgeDto),
          },
        },
      ],
    }).compile();

    controller = module.get<BadgesController>(BadgesController);
    service = module.get<BadgesService>(BadgesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAvailableBadges', () => {
    it('should return available badges with earning status', async () => {
      const result = await controller.getAvailableBadges(mockRequest as any);

      expect(service.getAvailableBadges).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockBadgeDto]);
    });
  });

  describe('getUserBadges', () => {
    it('should return user earned badges', async () => {
      const result = await controller.getUserBadges(mockRequest as any);

      expect(service.getUserBadges).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockUserBadgeDto]);
    });
  });

  describe('getBadgeStats', () => {
    it('should return badge statistics', async () => {
      const result = await controller.getBadgeStats(mockRequest as any);

      expect(service.getBadgeStats).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockBadgeStats);
    });
  });

  describe('generateShareToken', () => {
    it('should generate share token for badge', async () => {
      const result = await controller.generateShareToken('user-badge-1', mockRequest as any);

      expect(service.generateShareToken).toHaveBeenCalledWith('user-1', 'user-badge-1');
      expect(result).toEqual({
        shareToken: 'share-token-123',
        shareUrl: '/badges/shared/share-token-123',
      });
    });
  });

  describe('getSharedBadge', () => {
    it('should return shared badge by token', async () => {
      const result = await controller.getSharedBadge('share-token-123');

      expect(service.getSharedBadge).toHaveBeenCalledWith('share-token-123');
      expect(result).toEqual(mockUserBadgeDto);
    });
  });
});
