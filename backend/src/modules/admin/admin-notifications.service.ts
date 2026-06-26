import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { User } from '../user/entities/user.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../savings/entities/user-subscription.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';
import {
  BroadcastNotificationDto,
  ScheduleNotificationDto,
  PreviewNotificationDto,
  NotificationFilterDto,
  NotificationDeliveryDto,
  NotificationChannel,
} from './dto/admin-notification.dto';

// Use a custom notification type string since ADMIN_BROADCAST doesn't exist
const ADMIN_BROADCAST_TYPE = 'ADMIN_BROADCAST' as any;

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
    private readonly mailService: MailService,
  ) {}

  /**
   * Send broadcast notification to all users or targeted users via job queue
   */
  async broadcastNotification(
    dto: BroadcastNotificationDto,
  ): Promise<NotificationDeliveryDto> {
    const targetUsers = await this.getTargetUsers(dto.target);

    const delivery: NotificationDeliveryDto = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    const channels = dto.channels || [NotificationChannel.IN_APP];

    for (const user of targetUsers) {
      delivery.sent++;

      try {
        // Create in-app notification
        if (channels.includes(NotificationChannel.IN_APP)) {
          const notification = this.notificationRepository.create({
            userId: user.id,
            type: ADMIN_BROADCAST_TYPE,
            title: dto.title,
            message: dto.message,
            metadata: {
              channels,
              broadcast: true,
            },
          });
          await this.notificationRepository.save(notification);
          delivery.delivered++;
        }

        // Send email
        if (channels.includes(NotificationChannel.EMAIL) && user.email) {
          await this.mailService.sendRawMail(
            user.email,
            dto.title,
            dto.message,
          );
          delivery.delivered++;
        }

        // Push notification (placeholder - would integrate with FCM/APNs)
        if (channels.includes(NotificationChannel.PUSH)) {
          // TODO: Implement push notification integration
          delivery.delivered++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${user.id}: ${error.message}`,
        );
        delivery.failed++;
      }
    }

    this.logger.log(
      `Broadcast notification sent: ${delivery.sent} sent, ${delivery.delivered} delivered, ${delivery.failed} failed`,
    );
    return delivery;
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(
    dto: ScheduleNotificationDto,
  ): Promise<{ scheduleId: string }> {
    const scheduledAt = new Date(dto.scheduledAt);

    // Create a scheduled notification record
    const notification = this.notificationRepository.create({
      userId: 'SYSTEM', // System-wide
      type: NotificationType.ADMIN_BROADCAST,
      title: dto.title,
      message: dto.message,
      metadata: {
        scheduled: true,
        scheduledAt: scheduledAt.toISOString(),
        target: dto.target,
        channels: dto.channels || [NotificationChannel.IN_APP],
      },
    });

    await this.notificationRepository.save(notification);

    // In production, use a job scheduler like Bull/BullMQ
    // For now, we'll handle it in the scheduled job
    this.logger.log(`Notification scheduled for ${scheduledAt.toISOString()}`);

    return { scheduleId: notification.id };
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(scheduleId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: scheduleId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Scheduled notification ${scheduleId} not found`,
      );
    }

    if (!notification.metadata?.scheduled) {
      throw new NotFoundException(
        `Notification ${scheduleId} is not a scheduled notification`,
      );
    }

    await this.notificationRepository.delete(scheduleId);
    this.logger.log(`Scheduled notification ${scheduleId} cancelled`);
  }

  /**
   * Preview notification - shows sample recipients
   */
  async previewNotification(dto: PreviewNotificationDto): Promise<{
    previewUsers: { id: string; email: string; name: string }[];
    estimatedRecipients: number;
  }> {
    const targetUsers = await this.getTargetUsers(dto.target);
    const previewCount = dto.previewCount || 5;

    const previewUsers = targetUsers.slice(0, previewCount).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
    }));

    return {
      previewUsers,
      estimatedRecipients: targetUsers.length,
    };
  }

  /**
   * Get notification broadcast history
   */
  async getNotificationHistory(filter: NotificationFilterDto): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.type = :type', { type: ADMIN_BROADCAST_TYPE })
      .orderBy('notification.createdAt', 'DESC');

    if (filter.fromDate) {
      query.andWhere('notification.createdAt >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter.toDate) {
      query.andWhere('notification.createdAt <= :toDate', {
        toDate: filter.toDate,
      });
    }

    const [notifications, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  /**
   * Get delivery statistics for a notification
   */
  async getDeliveryStats(
    notificationId: string,
  ): Promise<NotificationDeliveryDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    // For broadcast notifications, calculate stats from the broadcast metadata
    const broadcastNotifications = await this.notificationRepository.find({
      where: {
        type: NotificationType.ADMIN_BROADCAST,
      },
    });

    // Simplified delivery stats
    const delivered = broadcastNotifications.filter((n) => !n.read).length;
    const read = broadcastNotifications.filter((n) => n.read).length;

    return {
      sent: broadcastNotifications.length,
      delivered,
      read,
      failed: 0,
    };
  }

  /**
   * Get target users based on filter criteria
   */
  private async getTargetUsers(target?: {
    roles?: string[];
    kycStatus?: string[];
    tiers?: string[];
    minSavings?: number;
    maxSavings?: number;
    userIds?: string[];
  }): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user');

    if (target?.userIds && target.userIds.length > 0) {
      query.andWhere('user.id IN (:...userIds)', { userIds: target.userIds });
    } else {
      // Default to active users
      query.where('user.isActive = :isActive', { isActive: true });

      if (target?.roles && target.roles.length > 0) {
        query.andWhere('user.role IN (:...roles)', { roles: target.roles });
      }

      if (target?.kycStatus && target.kycStatus.length > 0) {
        query.andWhere('user.kycStatus IN (:...kycStatus)', {
          kycStatus: target.kycStatus,
        });
      }

      if (target?.tiers && target.tiers.length > 0) {
        query.andWhere('user.tier IN (:...tiers)', { tiers: target.tiers });
      }
    }

    let users = await query.getMany();

    // Filter by savings tier if specified
    if (target?.minSavings !== undefined || target?.maxSavings !== undefined) {
      const userIdsWithSavings = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('subscription.userId', 'userId')
        .addSelect('SUM(subscription.amount)', 'total')
        .where('subscription.status = :status', {
          status: SubscriptionStatus.ACTIVE,
        })
        .groupBy('subscription.userId')
        .having(
          target.minSavings !== undefined && target.maxSavings !== undefined
            ? 'SUM(subscription.amount) BETWEEN :min AND :max'
            : target.minSavings !== undefined
              ? 'SUM(subscription.amount) >= :min'
              : 'SUM(subscription.amount) <= :max',
          {
            min: target.minSavings,
            max: target.maxSavings,
          },
        )
        .getRawMany();

      const validUserIds = new Set(userIdsWithSavings.map((u) => u.userId));
      users = users.filter((u) => validUserIds.has(u.id));
    }

    return users;
  }

  /**
   * Scheduled job to process scheduled notifications
   * Runs every minute to check for pending scheduled notifications
   */
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    const scheduledNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.metadata->>scheduled = :scheduled', {
        scheduled: 'true',
      })
      .andWhere('notification.metadata->>processed = :processed', {
        processed: 'false',
      })
      .andWhere('notification.metadata->scheduledAt <= :now', {
        now: now.toISOString(),
      })
      .getMany();

    for (const notification of scheduledNotifications) {
      try {
        const dto: BroadcastNotificationDto = {
          title: notification.title,
          message: notification.message,
          channels: notification.metadata?.channels || [
            NotificationChannel.IN_APP,
          ],
          target: notification.metadata?.target,
        };

        await this.broadcastNotification(dto);

        // Mark as processed
        notification.metadata = { ...notification.metadata, processed: true };
        await this.notificationRepository.save(notification);

        this.logger.log(`Processed scheduled notification ${notification.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled notification ${notification.id}: ${error.message}`,
        );
      }
    }
  }
}
