import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { UserNotificationsController } from './user-notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './entities/notification.entity';
import { UserPreference } from './entities/notification-preference.entity';
import { PendingNotification } from './entities/pending-notification.entity';
import { WaitlistEntry } from '../savings/entities/waitlist-entry.entity';
import { WaitlistEvent } from '../savings/entities/waitlist-event.entity';
import { Delegation } from '../governance/entities/delegation.entity';
import { GovernanceProposal } from '../governance/entities/governance-proposal.entity';
import { Vote } from '../governance/entities/vote.entity';
import { MailModule } from '../mail/mail.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { User } from '../user/entities/user.entity';
import { MilestoneSchedulerService } from './milestone-scheduler.service';
import { GovernanceNotificationScheduler } from './governance-notification.scheduler';
import { SavingsModule } from '../savings/savings.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserPreference,
      PendingNotification,
      User,
      WaitlistEntry,
      WaitlistEvent,
      Delegation,
      GovernanceProposal,
      Vote,
    ]),
    MailModule,
    BlockchainModule,
    SavingsModule,
    AuthModule,
  ],
  controllers: [NotificationsController, UserNotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    MilestoneSchedulerService,
    GovernanceNotificationScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
