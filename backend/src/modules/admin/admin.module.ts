import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from '../user/user.module';
import { SavingsModule } from '../savings/savings.module';
import { MailModule } from '../mail/mail.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CircuitBreakerModule } from '../../common/circuit-breaker/circuit-breaker.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminSavingsController } from './admin-savings.controller';
import { AdminWaitlistController } from './admin-waitlist.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { AdminWithdrawalService } from './admin-withdrawal.service';

import { CircuitBreakerController } from './circuit-breaker.controller';
import { AdminDisputesController } from './admin-disputes.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminNotificationsController } from './admin-notifications.controller';

import { AdminTransactionsController } from './admin-transactions.controller';

import { AdminUsersService } from './admin-users.service';
import { AdminSavingsService } from './admin-savings.service';
import { AdminDisputesService } from './admin-disputes.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminTransactionNote } from './entities/admin-transaction-note.entity';
import { User } from '../user/entities/user.entity';
import { UserSubscription } from '../savings/entities/user-subscription.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';
import { WithdrawalRequest } from '../savings/entities/withdrawal-request.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Dispute, DisputeTimeline } from '../disputes/entities/dispute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserSubscription,
      SavingsProduct,
      LedgerTransaction,
      WithdrawalRequest,
      AuditLog,
      Transaction,
      AdminTransactionNote,
      Dispute,
      DisputeTimeline,
      AuditLog,
      Notification,
    ]),
    UserModule,
    SavingsModule,
    MailModule,
    BlockchainModule,
    CircuitBreakerModule,
    NotificationsModule,
    EventEmitterModule,
  ],
  controllers: [
    AdminController,
    AdminSavingsController,
    AdminWaitlistController,
    AdminUsersController,
    AdminWithdrawalController,
  ],
  providers: [
    AdminUsersService,
    AdminSavingsService,
    AdminDisputesService,
    AdminAuditLogsService,
    AdminNotificationsService,
    AdminTransactionsService,
    AdminWithdrawalService,
  ],
  exports: [AdminDisputesService, AdminAuditLogsService],
})
export class AdminModule {}
