import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceNotificationScheduler } from './governance-notification.scheduler';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import { StellarService } from '../blockchain/stellar.service';
import { PendingNotification } from './entities/pending-notification.entity';
import { NotificationType } from './entities/notification.entity';
import {
  UserPreference,
  DigestFrequency,
} from './entities/notification-preference.entity';
import { User } from '../user/entities/user.entity';
import {
  GovernanceProposal,
  ProposalStatus,
} from '../governance/entities/governance-proposal.entity';
import { Vote } from '../governance/entities/vote.entity';

describe('GovernanceNotificationScheduler', () => {
  let scheduler: GovernanceNotificationScheduler;
  let notificationsService: any;
  let mailService: any;
  let stellarService: any;
  let pendingRepo: any;
  let preferenceRepo: any;
  let userRepo: any;
  let proposalRepo: any;
  let voteRepo: any;

  beforeEach(async () => {
    notificationsService = { dispatchNotification: jest.fn() };
    mailService = { sendGovernanceEmail: jest.fn() };
    stellarService = { getRpcServer: jest.fn() };

    pendingRepo = { find: jest.fn(), update: jest.fn(), create: jest.fn() };
    preferenceRepo = { find: jest.fn() };
    userRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };
    proposalRepo = { find: jest.fn() };
    voteRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceNotificationScheduler,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
        { provide: StellarService, useValue: stellarService },
        {
          provide: getRepositoryToken(PendingNotification),
          useValue: pendingRepo,
        },
        {
          provide: getRepositoryToken(UserPreference),
          useValue: preferenceRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(GovernanceProposal),
          useValue: proposalRepo,
        },
        { provide: getRepositoryToken(Vote), useValue: voteRepo },
      ],
    }).compile();

    scheduler = module.get<GovernanceNotificationScheduler>(
      GovernanceNotificationScheduler,
    );
  });

  describe('handleDailyDigest', () => {
    it('should process daily digests for users', async () => {
      preferenceRepo.find.mockResolvedValue([
        { userId: 'user-1', digestFrequency: DigestFrequency.DAILY },
      ]);
      pendingRepo.find.mockResolvedValue([
        { id: 'p1', title: 'Title 1', message: 'Msg 1' },
        { id: 'p2', title: 'Title 2', message: 'Msg 2' },
      ]);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      });

      await scheduler.handleDailyDigest();

      expect(mailService.sendGovernanceEmail).toHaveBeenCalled();
      expect(pendingRepo.update).toHaveBeenCalled();
    });
  });

  describe('handleVotingReminders', () => {
    it('should send reminders for proposals closing soon', async () => {
      stellarService.getRpcServer.mockReturnValue({
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 100000 }),
      });

      proposalRepo.find.mockResolvedValue([
        {
          id: 'prop-1',
          onChainId: 1,
          endBlock: 117250,
          status: ProposalStatus.ACTIVE,
        },
      ]);

      voteRepo.find.mockResolvedValue([]); // No one has voted

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-2', publicKey: 'G...' }]),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await scheduler.handleVotingReminders();

      expect(notificationsService.dispatchNotification).toHaveBeenCalled();
    });
  });
});
