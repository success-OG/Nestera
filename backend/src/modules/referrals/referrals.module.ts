import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from './entities/referral.entity';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import { User } from '../user/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ReferralsService } from './referrals.service';
import { CampaignsService } from './campaigns.service';
import { ReferralAnalyticsService } from './referral-analytics.service';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { UserReferralsController } from './user-referrals.controller';
import { ReferralAnalyticsController } from './referral-analytics.controller';
import { ReferralEventsListener } from './referral-events.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Referral,
      ReferralCampaign,
      User,
      Transaction,
      Notification,
    ]),
  ],
  controllers: [
    ReferralsController,
    AdminReferralsController,
    UserReferralsController,
    ReferralAnalyticsController,
  ],
  providers: [
    ReferralsService,
    CampaignsService,
    ReferralAnalyticsService,
    ReferralEventsListener,
  ],
  exports: [ReferralsService, CampaignsService, ReferralAnalyticsService],
})
export class ReferralsModule {}
