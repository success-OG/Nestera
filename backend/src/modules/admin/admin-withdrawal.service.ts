import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from '../savings/entities/withdrawal-request.entity';
import { User } from '../user/entities/user.entity';
import {
  AuditLog,
  AuditAction,
  AuditResourceType,
} from '../../common/entities/audit-log.entity';
import { MailService } from '../mail/mail.service';
import { SavingsService } from '../savings/savings.service';
import { PageOptionsDto } from '../../common/dto/page-options.dto';
import { PageDto } from '../../common/dto/page.dto';
import { paginate } from '../../common/helpers/pagination.helper';
import { WithdrawalStatsDto } from './dto/withdrawal-stats.dto';

@Injectable()
export class AdminWithdrawalService {
  private readonly logger = new Logger(AdminWithdrawalService.name);

  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly savingsService: SavingsService,
    private readonly mailService: MailService,
  ) {}

  async listPending(opts: PageOptionsDto): Promise<PageDto<WithdrawalRequest>> {
    const queryBuilder = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.subscription', 'subscription')
      .where('withdrawal.status = :status', {
        status: WithdrawalStatus.PENDING,
      });

    return paginate(queryBuilder, opts);
  }

  async getDetail(id: string): Promise<WithdrawalRequest> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['subscription', 'subscription.product'],
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request ${id} not found`);
    }

    return withdrawal;
  }

  async approve(id: string, actor: User): Promise<WithdrawalRequest> {
    const startTime = Date.now();
    const correlationId = `approve-${id}-${Date.now()}`;

    try {
      const withdrawal = await this.withdrawalRepository.findOne({
        where: { id },
        relations: ['subscription', 'subscription.product'],
      });

      if (!withdrawal) {
        throw new NotFoundException(`Withdrawal request ${id} not found`);
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(
          'Withdrawal request is not in PENDING status',
        );
      }

      // Update status to PROCESSING
      withdrawal.status = WithdrawalStatus.PROCESSING;
      await this.withdrawalRepository.save(withdrawal);

      // Trigger the existing withdrawal processing flow
      await this.savingsService['processWithdrawal'](withdrawal.id);

      // Fetch user for email
      const user = await this.userRepository.findOne({
        where: { id: withdrawal.userId },
      });

      // Send approval email (fire-and-forget)
      if (user) {
        try {
          await this.mailService.sendWithdrawalApprovedEmail(
            user.email,
            user.name || 'User',
            String(withdrawal.amount),
            String(withdrawal.penalty),
            String(withdrawal.netAmount),
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send approval email for withdrawal ${id}: ${(error as Error).message}`,
          );
        }
      }

      // Write audit log
      await this.writeAuditLog({
        correlationId,
        endpoint: `/admin/withdrawals/${id}/approve`,
        method: 'POST',
        action: AuditAction.APPROVE,
        actor: actor.email,
        resourceId: id,
        resourceType: AuditResourceType.WITHDRAWAL_REQUEST,
        statusCode: 200,
        durationMs: Date.now() - startTime,
        success: true,
        errorMessage: null,
      });

      return withdrawal;
    } catch (error) {
      // Write error audit log
      await this.writeAuditLog({
        correlationId,
        endpoint: `/admin/withdrawals/${id}/approve`,
        method: 'POST',
        action: AuditAction.APPROVE,
        actor: actor.email,
        resourceId: id,
        resourceType: AuditResourceType.WITHDRAWAL_REQUEST,
        statusCode:
          error instanceof NotFoundException
            ? 404
            : error instanceof BadRequestException
              ? 400
              : 500,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }

  async reject(
    id: string,
    reason: string,
    actor: User,
  ): Promise<WithdrawalRequest> {
    const startTime = Date.now();
    const correlationId = `reject-${id}-${Date.now()}`;

    try {
      const withdrawal = await this.withdrawalRepository.findOne({
        where: { id },
        relations: ['subscription', 'subscription.product'],
      });

      if (!withdrawal) {
        throw new NotFoundException(`Withdrawal request ${id} not found`);
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException(
          'Withdrawal request is not in PENDING status',
        );
      }

      // Update status to FAILED and persist reason
      withdrawal.status = WithdrawalStatus.FAILED;
      withdrawal.reason = reason;
      await this.withdrawalRepository.save(withdrawal);

      // Fetch user for email
      const user = await this.userRepository.findOne({
        where: { id: withdrawal.userId },
      });

      // Send rejection email (fire-and-forget)
      if (user) {
        try {
          await this.mailService.sendWithdrawalRejectedEmail(
            user.email,
            user.name || 'User',
            reason,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send rejection email for withdrawal ${id}: ${(error as Error).message}`,
          );
        }
      }

      // Write audit log
      await this.writeAuditLog({
        correlationId,
        endpoint: `/admin/withdrawals/${id}/reject`,
        method: 'POST',
        action: AuditAction.REJECT,
        actor: actor.email,
        resourceId: id,
        resourceType: AuditResourceType.WITHDRAWAL_REQUEST,
        statusCode: 200,
        durationMs: Date.now() - startTime,
        success: true,
        errorMessage: null,
      });

      return withdrawal;
    } catch (error) {
      // Write error audit log
      await this.writeAuditLog({
        correlationId,
        endpoint: `/admin/withdrawals/${id}/reject`,
        method: 'POST',
        action: AuditAction.REJECT,
        actor: actor.email,
        resourceId: id,
        resourceType: AuditResourceType.WITHDRAWAL_REQUEST,
        statusCode:
          error instanceof NotFoundException
            ? 404
            : error instanceof BadRequestException
              ? 400
              : 500,
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: (error as Error).message,
      });

      throw error;
    }
  }

  async getStats(): Promise<WithdrawalStatsDto> {
    const allWithdrawals = await this.withdrawalRepository.find();

    const total = allWithdrawals.length;

    // Count by status
    const byStatus: Record<WithdrawalStatus, number> = {
      [WithdrawalStatus.PENDING]: 0,
      [WithdrawalStatus.PROCESSING]: 0,
      [WithdrawalStatus.COMPLETED]: 0,
      [WithdrawalStatus.FAILED]: 0,
    };

    let completedCount = 0;
    let totalProcessingTimeMs = 0;

    for (const withdrawal of allWithdrawals) {
      byStatus[withdrawal.status]++;

      if (
        withdrawal.status === WithdrawalStatus.COMPLETED &&
        withdrawal.completedAt &&
        withdrawal.createdAt
      ) {
        completedCount++;
        totalProcessingTimeMs +=
          new Date(withdrawal.completedAt).getTime() -
          new Date(withdrawal.createdAt).getTime();
      }
    }

    // Calculate approval rate: (COMPLETED count / total) * 100
    const approvalRate =
      total > 0 ? (byStatus[WithdrawalStatus.COMPLETED] / total) * 100 : 0;

    // Calculate average processing time
    const averageProcessingTimeMs =
      completedCount > 0 ? totalProcessingTimeMs / completedCount : 0;

    return {
      total,
      byStatus,
      approvalRate: Number(approvalRate.toFixed(2)),
      averageProcessingTimeMs: Math.round(averageProcessingTimeMs),
    };
  }

  private async writeAuditLog(data: {
    correlationId: string;
    endpoint: string;
    method: string;
    action: AuditAction;
    actor: string;
    resourceId: string;
    resourceType: AuditResourceType;
    statusCode: number;
    durationMs: number;
    success: boolean;
    errorMessage: string | null;
  }): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(data);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${(error as Error).message}`,
      );
    }
  }
}
