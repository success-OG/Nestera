import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { PageDto } from '../../common/dto/page.dto';
import { PageMetaDto } from '../../common/dto/page-meta.dto';
import { PageOptionsDto } from '../../common/dto/page-options.dto';
import {
  UserPreference,
  DigestFrequency,
} from './entities/notification-preference.entity';
import { PendingNotification } from './entities/pending-notification.entity';
import { Delegation } from '../governance/entities/delegation.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../user/entities/user.entity';
import { WaitlistEntry } from '../savings/entities/waitlist-entry.entity';
import { WaitlistEvent } from '../savings/entities/waitlist-event.entity';
import { Role } from '../../common/enums/role.enum';

export interface SweepCompletedEvent {
  userId: string;
  amount: string;
  publicKey: string;
  timestamp: Date;
}

export interface WithdrawalCompletedEvent {
  userId: string;
  withdrawalId: string;
  amount: number;
  penalty: number;
  netAmount: number;
  timestamp: Date;
}

export interface ClaimUpdatedEvent {
  userId: string;
  claimId: string;
  status: string;
  claimAmount: number;
  notes?: string;
  timestamp: Date;
}

export interface MilestoneAchievedEvent {
  userId: string;
  goalId: string;
  milestoneId: string;
  percentage: number;
  label: string;
  bonusPoints: number;
  achievedAt: Date;
}

export interface BadgeEarnedEvent {
  userId: string;
  badgeId: string;
  badgeCode: string;
  badgeName: string;
  points: number;
  earnedAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(PendingNotification)
    private readonly pendingRepository: Repository<PendingNotification>,
    @InjectRepository(Delegation)
    private readonly delegationRepository: Repository<Delegation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(WaitlistEvent)
    private readonly waitlistEventRepository: Repository<WaitlistEvent>,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Listen to sweep.completed event and create notifications
   */
  @OnEvent('sweep.completed')
  async handleSweepCompleted(event: SweepCompletedEvent) {
    this.logger.log(
      `Processing sweep.completed event for user ${event.userId}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for sweep notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      // Create in-app notification
      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: NotificationType.SWEEP_COMPLETED,
          title: 'Account Sweep Completed',
          message: `Successfully swept ${event.amount} to your savings account.`,
          metadata: {
            amount: event.amount,
            publicKey: event.publicKey,
            timestamp: event.timestamp,
          },
        });
      }

      // Send email notification
      if (preferences.emailNotifications && preferences.sweepNotifications) {
        await this.mailService.sendSweepCompletedEmail(
          user.email,
          user.name || 'User',
          event.amount,
        );
      }

      this.logger.log(`Sweep notification processed for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Error processing sweep.completed event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to milestone.achieved event and create in-app notification
   */
  @OnEvent('milestone.achieved')
  async handleMilestoneAchieved(event: MilestoneAchievedEvent): Promise<void> {
    this.logger.log(
      `Processing milestone.achieved event for user ${event.userId}, goal ${event.goalId}`,
    );

    try {
      const preferences = await this.getOrCreatePreferences(event.userId);

      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: NotificationType.MILESTONE_ACHIEVED,
          title: `Milestone Reached: ${event.percentage}%`,
          message: `${event.label}${event.bonusPoints > 0 ? ` You earned ${event.bonusPoints} bonus points!` : ''}`,
          metadata: {
            goalId: event.goalId,
            milestoneId: event.milestoneId,
            percentage: event.percentage,
            bonusPoints: event.bonusPoints,
            achievedAt: event.achievedAt,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error processing milestone.achieved event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to badge.earned event and create in-app notification
   */
  @OnEvent('badge.earned')
  async handleBadgeEarned(event: BadgeEarnedEvent): Promise<void> {
    this.logger.log(
      `Processing badge.earned event for user ${event.userId}, badge ${event.badgeCode}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for badge notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: NotificationType.BADGE_EARNED,
          title: `Badge Earned: ${event.badgeName}`,
          message: `Congratulations! You earned the "${event.badgeName}" badge${event.points > 0 ? ` and ${event.points} points!` : '!'}`,
          metadata: {
            badgeId: event.badgeId,
            badgeCode: event.badgeCode,
            badgeName: event.badgeName,
            points: event.points,
            earnedAt: event.earnedAt,
            ...event.metadata,
          },
        });
      }

      if (preferences.emailNotifications && preferences.badgeNotifications) {
        await this.mailService.sendBadgeEarnedEmail(
          user.email,
          user.name || 'User',
          event.badgeName,
          event.points,
        );
      }

      this.logger.log(`Badge notification processed for user ${event.userId}`);
    } catch (error) {
      this.logger.error(
        `Error processing badge.earned event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to withdrawal.completed event and create notifications
   */
  @OnEvent('withdrawal.completed')
  async handleWithdrawalCompleted(event: WithdrawalCompletedEvent) {
    this.logger.log(
      `Processing withdrawal.completed event for user ${event.userId}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for withdrawal notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      const penaltyNote =
        event.penalty > 0
          ? ` An early withdrawal penalty of ${event.penalty} was applied.`
          : '';

      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: NotificationType.WITHDRAWAL_COMPLETED,
          title: 'Withdrawal Completed',
          message: `Your withdrawal of ${event.netAmount} has been completed.${penaltyNote}`,
          metadata: {
            withdrawalId: event.withdrawalId,
            amount: event.amount,
            penalty: event.penalty,
            netAmount: event.netAmount,
            timestamp: event.timestamp,
          },
        });
      }

      if (preferences.emailNotifications) {
        await this.mailService.sendWithdrawalCompletedEmail(
          user.email,
          user.name || 'User',
          String(event.amount),
          String(event.penalty),
          String(event.netAmount),
        );
      }

      this.logger.log(
        `Withdrawal notification processed for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing withdrawal.completed event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to claim.updated event and create notifications
   */
  @OnEvent('claim.updated')
  async handleClaimUpdated(event: ClaimUpdatedEvent) {
    this.logger.log(
      `Processing claim.updated event for claim ${event.claimId}`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for claim notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      // Determine notification type based on claim status
      let notificationType = NotificationType.CLAIM_UPDATED;
      let title = 'Claim Status Updated';
      let message = `Your claim has been ${event.status.toLowerCase()}.`;

      if (event.status === 'APPROVED') {
        notificationType = NotificationType.CLAIM_APPROVED;
        title = 'Claim Approved';
        message = `Your claim for $${event.claimAmount} has been approved.`;
      } else if (event.status === 'REJECTED') {
        notificationType = NotificationType.CLAIM_REJECTED;
        title = 'Claim Rejected';
        message = `Your claim for $${event.claimAmount} has been rejected.`;
        if (event.notes) {
          message += ` Reason: ${event.notes}`;
        }
      }

      // Create in-app notification
      if (preferences.inAppNotifications) {
        await this.createNotification({
          userId: event.userId,
          type: notificationType,
          title,
          message,
          metadata: {
            claimId: event.claimId,
            status: event.status,
            claimAmount: event.claimAmount,
            notes: event.notes,
            timestamp: event.timestamp,
          },
        });
      }

      // Send email notification
      if (preferences.emailNotifications && preferences.claimNotifications) {
        await this.mailService.sendClaimStatusEmail(
          user.email,
          user.name || 'User',
          event.status,
          event.claimAmount,
          event.notes,
        );
      }

      this.logger.log(
        `Claim notification processed for claim ${event.claimId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing claim.updated event for claim ${event.claimId}`,
        error,
      );
    }
  }

  /**
   * Handle goal milestone events emitted by the scheduler.
   * Payload: { userId, goalId, percentage, goalName, metadata? }
   */
  @OnEvent('goal.milestone')
  async handleGoalMilestone(event: {
    userId: string;
    goalId: string;
    percentage: number;
    goalName: string;
    metadata?: Record<string, any>;
  }) {
    this.logger.log(
      `Processing goal.milestone event for user ${event.userId} (goal ${event.goalId})`,
    );

    try {
      const user = await this.userRepository.findOne({
        where: { id: event.userId },
      });

      if (!user) {
        this.logger.warn(
          `User ${event.userId} not found for goal milestone notification`,
        );
        return;
      }

      const preferences = await this.getOrCreatePreferences(event.userId);

      const title =
        event.percentage === 100
          ? `Goal complete: ${event.goalName}`
          : `Milestone reached: ${event.percentage}%`;

      const message =
        event.percentage === 100
          ? `Amazing — you've reached your goal "${event.goalName}"!`
          : `You're ${event.percentage}% of the way to "${event.goalName}" — keep it up!`;

      // Create in-app notification if enabled
      if (
        preferences.inAppNotifications &&
        preferences.milestoneNotifications
      ) {
        await this.createNotification({
          userId: event.userId,
          type:
            event.percentage === 100
              ? NotificationType.GOAL_COMPLETED
              : NotificationType.GOAL_MILESTONE,
          title,
          message,
          metadata: {
            goalId: event.goalId,
            percentage: event.percentage,
            ...event.metadata,
          },
        });
      }

      // Send email if enabled
      if (
        preferences.emailNotifications &&
        preferences.milestoneNotifications
      ) {
        await this.mailService.sendGoalMilestoneEmail(
          user.email,
          user.name || 'User',
          event.goalName,
          event.percentage,
        );
      }

      this.logger.log(
        `Goal milestone notification processed for user ${event.userId} (goal ${event.goalId})`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing goal.milestone event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Handle product availability events and notify top waitlist entries.
   * Payload: { productId, spots }
   */
  @OnEvent('waitlist.product.available')
  async handleWaitlistAvailability(event: {
    productId: string;
    spots?: number;
  }) {
    const spots = event.spots ?? 1;

    try {
      // Get top entries by priority then createdAt
      const entries = await this.waitlistRepository
        .createQueryBuilder('w')
        .where('w.productId = :productId', { productId: event.productId })
        .andWhere('w.notifiedAt IS NULL')
        .orderBy('w.priority', 'DESC')
        .addOrderBy('w.createdAt', 'ASC')
        .limit(spots)
        .getMany();

      if (!entries.length) return;

      for (const entry of entries) {
        const user = await this.userRepository.findOne({
          where: { id: entry.userId },
        });

        if (!user) continue;

        const title = 'Savings product available';
        const message = `A savings product you're waiting for is now available. Visit the app to claim your spot.`;

        // In-app notification
        const preferences = await this.getOrCreatePreferences(entry.userId);

        if (preferences.inAppNotifications) {
          await this.createNotification({
            userId: entry.userId,
            type: NotificationType.WAITLIST_AVAILABLE,
            title,
            message,
            metadata: { productId: event.productId },
          });
        }

        // Email notification
        if (preferences.emailNotifications) {
          await this.mailService.sendWaitlistAvailabilityEmail(
            user.email,
            user.name || 'User',
            event.productId,
          );
        }

        // record NOTIFY event for analytics
        try {
          await this.waitlistEventRepository.save(
            this.waitlistEventRepository.create({
              entryId: entry.id,
              userId: entry.userId,
              productId: event.productId,
              type: 'NOTIFY',
              metadata: null,
            }),
          );
        } catch (e) {
          // ignore analytics failures
        }
      }

      // Mark entries notified
      const ids = entries.map((e) => e.id);
      await this.waitlistRepository
        .createQueryBuilder()
        .update(WaitlistEntry)
        .set({ notifiedAt: new Date() })
        .where('id IN (:...ids)', { ids })
        .execute();
    } catch (error) {
      this.logger.error(
        `Error handling waitlist availability for product ${event.productId}`,
        error,
      );
    }
  }

  @OnEvent('savings.capacity.threshold')
  async handleCapacityAlert(event: {
    productId: string;
    utilizationPercentage: number;
    isFull: boolean;
  }) {
    try {
      const admins = await this.userRepository.find({
        where: { role: Role.ADMIN },
        select: ['id'],
      });

      if (!admins.length) {
        return;
      }

      const title = event.isFull
        ? 'Savings product auto-deactivated'
        : 'Savings product nearing capacity';
      const message = event.isFull
        ? `Product ${event.productId} reached maximum capacity and was auto-deactivated.`
        : `Product ${event.productId} is ${event.utilizationPercentage}% utilized.`;

      await Promise.all(
        admins.map((admin) =>
          this.createNotification({
            userId: admin.id,
            type: NotificationType.ADMIN_CAPACITY_ALERT,
            title,
            message,
            metadata: event,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error processing savings.capacity.threshold for product ${event.productId}`,
        error,
      );
    }
  }

  /**
   * Create a notification in the database
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || null,
      read: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', savedNotification);
    return savedNotification;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { userId, read: false },
      order: { createdAt: 'ASC' },
    });
  }

  async getNotificationsSince(
    userId: string,
    since: string | Date,
  ): Promise<Notification[]> {
    const sinceDate = typeof since === 'string' ? new Date(since) : since;
    if (Number.isNaN(sinceDate.getTime())) {
      return [];
    }

    return await this.notificationRepository.find({
      where: {
        userId,
        createdAt: MoreThan(sinceDate),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<Notification>> {
    const [notifications, totalItemCount] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: pageOptionsDto.skip,
        take: pageOptionsDto.limit,
      });

    const meta = new PageMetaDto({ pageOptionsDto, totalItemCount });
    return new PageDto(notifications, meta);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    await this.notificationRepository.update(
      { id: notificationId },
      { read: true },
    );

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  /**
   * Get or create notification preferences for user
   */
  async getOrCreatePreferences(userId: string): Promise<UserPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({ userId });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Create default preferences for a user
   */
  async createPreferences(userId: string): Promise<UserPreference> {
    return this.getOrCreatePreferences(userId);
  }

  /**
   * Delete preference record for a user, falling back to defaults.
   */
  async deletePreferences(userId: string): Promise<void> {
    await this.preferenceRepository.delete({ userId });
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserPreference>,
  ): Promise<UserPreference> {
    let preferences = await this.getOrCreatePreferences(userId);

    Object.assign(preferences, updates);
    preferences = await this.preferenceRepository.save(preferences);

    return preferences;
  }

  /**
   * Listen to governance.proposal.created event
   */
  @OnEvent('governance.proposal.created')
  async handleProposalCreated(event: {
    proposalId: string;
    onChainId: number;
    proposer: string;
    title: string;
  }) {
    this.logger.log(
      `Processing governance.proposal.created for ${event.onChainId}`,
    );

    try {
      // Find all users who have governance notifications enabled
      const usersWithPrefs = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect(
          'notification_preferences',
          'pref',
          'pref.userId = user.id',
        )
        .where('pref.governanceNotifications = true')
        .getMany();

      for (const user of usersWithPrefs) {
        await this.dispatchNotification({
          userId: user.id,
          type: NotificationType.GOVERNANCE_PROPOSAL_CREATED,
          title: 'New Governance Proposal',
          message: `A new proposal "#${event.onChainId}: ${event.title}" has been created.`,
          metadata: event,
        });
      }
    } catch (error) {
      this.logger.error('Error processing governance.proposal.created', error);
    }
  }

  /**
   * Listen to governance.vote.cast event to notify delegators
   */
  @OnEvent('governance.vote.cast')
  async handleVoteCast(event: {
    voter: string;
    onChainId: number;
    direction: string;
    weight: string;
  }) {
    this.logger.log(`Processing governance.vote.cast by ${event.voter}`);

    try {
      // Find all delegators for this voter
      const delegations = await this.delegationRepository.find({
        where: { delegateAddress: event.voter },
      });

      for (const delegation of delegations) {
        // Find user by delegator address
        const user = await this.userRepository.findOne({
          where: { publicKey: delegation.delegatorAddress },
        });

        if (user) {
          await this.dispatchNotification({
            userId: user.id,
            type: NotificationType.GOVERNANCE_DELEGATE_VOTED,
            title: 'Your Delegate Voted',
            message: `Your delegate ${event.voter.slice(0, 6)}... voted ${event.direction} on proposal #${event.onChainId}.`,
            metadata: event,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing governance.vote.cast', error);
    }
  }

  /**
   * Listen to governance.proposal.status_updated event
   */
  @OnEvent('governance.proposal.status_updated')
  async handleProposalStatusUpdated(event: {
    proposalId: string;
    onChainId: number;
    status: string;
  }) {
    this.logger.log(
      `Processing governance.proposal.status_updated for ${event.onChainId} to ${event.status}`,
    );

    try {
      // Notify everyone about significant status changes (Passed/Failed)
      const usersWithPrefs = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect(
          'notification_preferences',
          'pref',
          'pref.userId = user.id',
        )
        .where('pref.governanceNotifications = true')
        .getMany();

      const type =
        event.status === 'Passed'
          ? NotificationType.GOVERNANCE_PROPOSAL_QUEUED
          : NotificationType.GOVERNANCE_PROPOSAL_EXECUTED; // Simplified for demo

      for (const user of usersWithPrefs) {
        await this.dispatchNotification({
          userId: user.id,
          type,
          title: `Proposal #${event.onChainId} ${event.status}`,
          message: `Governance proposal #${event.onChainId} has been successfully ${event.status.toLowerCase()}.`,
          metadata: event,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error processing governance.proposal.status_updated',
        error,
      );
    }
  }

  /**
   * Helper to dispatch notification based on user preferences and digest settings
   */
  async dispatchNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }) {
    const preferences = await this.getOrCreatePreferences(data.userId);
    const user = await this.userRepository.findOne({
      where: { id: data.userId },
    });

    if (!user) return;

    // 1. Always create In-App notification if enabled
    if (preferences.inAppNotifications) {
      await this.createNotification(data);
    }

    // 2. Handle Email based on Digest Frequency
    if (preferences.emailNotifications) {
      if (preferences.digestFrequency === DigestFrequency.INSTANT) {
        // Send instant email
        await this.mailService.sendGovernanceEmail(
          user.email,
          user.name || 'User',
          data.title,
          data.message,
        );
      } else {
        // Store for Daily/Weekly digest
        await this.pendingRepository.save(
          this.pendingRepository.create({
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            metadata: data.metadata,
          }),
        );
      }
    }
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      createdAt: { $lt: cutoffDate } as any,
    });

    this.logger.log(
      `Deleted ${result.affected} notifications older than ${daysOld} days`,
    );
  }
}
