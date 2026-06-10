import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';
import { PendingNotification } from './entities/pending-notification.entity';
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
import { MailService } from '../mail/mail.service';
import { StellarService } from '../blockchain/stellar.service';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class GovernanceNotificationScheduler {
  private readonly logger = new Logger(GovernanceNotificationScheduler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly stellarService: StellarService,
    @InjectRepository(PendingNotification)
    private readonly pendingRepo: Repository<PendingNotification>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepo: Repository<UserPreference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(GovernanceProposal)
    private readonly proposalRepo: Repository<GovernanceProposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  /**
   * Daily Digest: Every day at midnight
   */
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyDigest() {
    this.logger.log('Starting Daily Governance Digest...');
    await this.processDigests(DigestFrequency.DAILY);
  }

  /**
   * Weekly Digest: Every Monday at midnight
   */
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_WEEKEND)
  async handleWeeklyDigest() {
    this.logger.log('Starting Weekly Governance Digest...');
    await this.processDigests(DigestFrequency.WEEKLY);
  }

  /**
   * Voting Reminders: Every hour
   * Notifies users who haven't voted on proposals closing in ~24 hours
   */
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_HOUR)
  async handleVotingReminders() {
    this.logger.log('Checking for upcoming voting deadlines...');

    try {
      // 1. Get current ledger/block from Stellar
      // Since we don't have a direct getTime, we'll estimate based on ledger closing time (~5s)
      // For a 24h reminder, we look for endBlock - currentBlock ≈ 17280 ledgers
      const latestLedger = await this.getCurrentLedger();
      if (!latestLedger) return;

      const reminderWindowStart = latestLedger + 17000;
      const reminderWindowEnd = latestLedger + 17500; // ~1 hour window

      const closingSoon = await this.proposalRepo.find({
        where: {
          status: ProposalStatus.ACTIVE,
          endBlock: MoreThan(latestLedger), // Is this correct?
          // We want proposals where endBlock is within the reminder window
        },
      });

      const relevantProposals = closingSoon.filter(
        (p) =>
          p.endBlock >= reminderWindowStart && p.endBlock <= reminderWindowEnd,
      );

      for (const proposal of relevantProposals) {
        // Find users who have NOT voted yet
        const voters = await this.voteRepo.find({
          where: { proposalId: proposal.id },
          select: ['walletAddress'],
        });
        const votedAddresses = voters.map((v) => v.walletAddress);

        // Notify all users with governance prefs enabled who haven't voted
        const usersToNotify = await this.userRepo
          .createQueryBuilder('user')
          .innerJoin(
            'notification_preferences',
            'pref',
            'pref.userId = user.id',
          )
          .where('pref.governanceNotifications = true')
          .getMany();

        for (const user of usersToNotify) {
          if (user.publicKey && !votedAddresses.includes(user.publicKey)) {
            await this.notificationsService.dispatchNotification({
              userId: user.id,
              type: NotificationType.GOVERNANCE_VOTING_REMINDER,
              title: 'Voting Deadline Approaching',
              message: `The voting period for proposal #${proposal.onChainId} ends in less than 24 hours. Don't forget to cast your vote!`,
              metadata: {
                onChainId: proposal.onChainId,
                proposalId: proposal.id,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in handleVotingReminders', error);
    }
  }

  private async processDigests(frequency: DigestFrequency) {
    try {
      const usersWithDigest = await this.preferenceRepo.find({
        where: {
          digestFrequency: frequency,
          emailNotifications: true,
        },
      });

      for (const pref of usersWithDigest) {
        const pending = await this.pendingRepo.find({
          where: { userId: pref.userId, processed: false },
          order: { createdAt: 'ASC' },
        });

        if (pending.length === 0) continue;

        const user = await this.userRepo.findOne({
          where: { id: pref.userId },
        });
        if (!user) continue;

        // Construct digest message
        const digestTitle = `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Governance Digest`;
        let digestMessage = `Here is your governance update:\n\n`;

        for (const item of pending) {
          digestMessage += `- ${item.title}: ${item.message}\n`;
        }

        // Send email
        await this.mailService.sendGovernanceEmail(
          user.email,
          user.name || 'User',
          digestTitle,
          digestMessage,
        );

        // Mark as processed
        await this.pendingRepo.update(
          { id: In(pending.map((p) => p.id)) },
          { processed: true },
        );
      }
    } catch (error) {
      this.logger.error(`Error processing ${frequency} digests`, error);
    }
  }

  private async getCurrentLedger(): Promise<number | null> {
    try {
      const rpcServer = this.stellarService.getRpcServer();
      const response = await rpcServer.getLatestLedger();
      return response.sequence;
    } catch (error) {
      this.logger.warn('Could not fetch latest ledger from RPC', error);
      return null;
    }
  }
}
