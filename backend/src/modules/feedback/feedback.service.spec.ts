import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import {
  FeedbackSubmission,
  FeedbackCategory,
  FeedbackStatus,
} from './entities/feedback.entity';

const mockRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    repo = mockRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getRepositoryToken(FeedbackSubmission), useValue: repo },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('submit', () => {
    it('creates feedback with SUBMITTED status', async () => {
      const dto = {
        category: FeedbackCategory.BUG_REPORT,
        rating: 3,
        comment: 'App crashes on login screen when using biometric auth',
      };
      const saved = {
        id: 'fb-1',
        userId: 'u1',
        ...dto,
        status: FeedbackStatus.SUBMITTED,
      };
      repo.save.mockResolvedValue(saved);

      const result = await service.submit('u1', dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          status: FeedbackStatus.SUBMITTED,
        }),
      );
      expect(result).toEqual(saved);
    });
  });

  describe('updateStatus', () => {
    it('updates status and sets resolvedAt for RESOLVED', async () => {
      const feedback = {
        id: 'fb-1',
        userId: 'u1',
        status: FeedbackStatus.SUBMITTED,
      };
      repo.findOne.mockResolvedValue(feedback);
      repo.save.mockImplementation((f) => Promise.resolve(f));

      const result = await service.updateStatus('fb-1', {
        status: FeedbackStatus.RESOLVED,
        adminNotes: 'Fixed in v2.1',
      });

      expect(result.status).toBe(FeedbackStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('throws when feedback not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('bad', { status: FeedbackStatus.CLOSED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalytics', () => {
    it('returns aggregated analytics', async () => {
      repo.find.mockResolvedValue([
        {
          category: FeedbackCategory.BUG_REPORT,
          status: FeedbackStatus.SUBMITTED,
          rating: 5,
        },
        {
          category: FeedbackCategory.GENERAL,
          status: FeedbackStatus.RESOLVED,
          rating: 3,
        },
        {
          category: FeedbackCategory.FEATURE_REQUEST,
          status: FeedbackStatus.SUBMITTED,
          rating: null,
        },
      ]);

      const analytics = await service.getAnalytics();

      expect(analytics.total).toBe(3);
      expect(analytics.byCategory[FeedbackCategory.BUG_REPORT]).toBe(1);
      expect(analytics.averageRating).toBe(4);
    });
  });
});
