import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as archiver from 'archiver';
import {
  DataExportRequest,
  ExportStatus,
} from './entities/data-export-request.entity';
import { User } from '../user/entities/user.entity';
import {
  Transaction,
  TxType,
} from '../transactions/entities/transaction.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../savings/entities/savings-goal.entity';
import { MailService } from '../mail/mail.service';

const EXPORT_DIR = path.join(os.tmpdir(), 'nestera-exports');
const LINK_EXPIRY_DAYS = 7;

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @InjectRepository(DataExportRequest)
    private readonly exportRepository: Repository<DataExportRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(SavingsGoal)
    private readonly savingsGoalRepository: Repository<SavingsGoal>,
    private readonly mailService: MailService,
  ) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  /**
   * Create an export request and trigger async processing.
   */
  async requestExport(
    userId: string,
  ): Promise<{ requestId: string; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const request = this.exportRepository.create({
      userId,
      status: ExportStatus.PENDING,
    });
    const saved = await this.exportRepository.save(request);

    this.logger.log(
      `Data export requested for user ${userId}, request ${saved.id}`,
    );

    // Trigger async processing (fire-and-forget)
    this.processExport(saved.id, user).catch((err) =>
      this.logger.error(`Export ${saved.id} failed`, err),
    );

    return {
      requestId: saved.id,
      message:
        'Export request received. You will receive an email when your data is ready.',
    };
  }

  /**
   * Download a ready export by token.
   */
  async getExportFile(
    token: string,
  ): Promise<{ filePath: string; userId: string }> {
    const request = await this.exportRepository.findOne({ where: { token } });
    if (!request || request.status !== ExportStatus.READY) {
      throw new NotFoundException('Export not found or not ready');
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      await this.exportRepository.update(request.id, {
        status: ExportStatus.EXPIRED,
      });
      throw new BadRequestException('Export link has expired');
    }
    if (!request.filePath || !fs.existsSync(request.filePath)) {
      throw new NotFoundException('Export file not found');
    }
    return { filePath: request.filePath, userId: request.userId };
  }

  /**
   * Get export request status.
   */
  async getExportStatus(requestId: string, userId: string) {
    const request = await this.exportRepository.findOne({
      where: { id: requestId, userId },
    });
    if (!request) throw new NotFoundException('Export request not found');
    return {
      requestId: request.id,
      status: request.status,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
      expiresAt: request.expiresAt,
    };
  }

  /**
   * List all export requests for a user (history/log).
   */
  async getExportHistory(userId: string) {
    const requests = await this.exportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return requests.map(
      ({ id, status, createdAt, completedAt, expiresAt }) => ({
        requestId: id,
        status,
        createdAt,
        completedAt,
        expiresAt,
      }),
    );
  }

  /**
   * Async: build ZIP, update record, email user.
   */
  private async processExport(requestId: string, user: User): Promise<void> {
    await this.exportRepository.update(requestId, {
      status: ExportStatus.PROCESSING,
    });

    try {
      const [transactions, notifications, goals] = await Promise.all([
        this.transactionRepository.find({ where: { userId: user.id } }),
        this.notificationRepository.find({ where: { userId: user.id } }),
        this.savingsGoalRepository.find({ where: { userId: user.id } }),
      ]);

      const zipPath = path.join(EXPORT_DIR, `${requestId}.zip`);
      await this.buildZip(zipPath, {
        'profile.json': {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        'transactions.json': transactions,
        'goals.json': goals,
        'notifications.json': notifications,
      });

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + LINK_EXPIRY_DAYS * 86_400_000);

      await this.exportRepository.update(requestId, {
        status: ExportStatus.READY,
        token,
        filePath: zipPath,
        expiresAt,
        completedAt: new Date(),
      });

      // Email the download link
      const downloadUrl = `/users/data/export/download/${token}`;
      await this.mailService.sendRawMail(
        user.email,
        'Your Nestera data export is ready',
        `Hi ${user.name || 'there'},\n\nYour data export is ready. Download it here:\n${downloadUrl}\n\nThis link expires in ${LINK_EXPIRY_DAYS} days.\n\nNestera Team`,
      );

      this.logger.log(`Export ${requestId} completed for user ${user.id}`);
    } catch (err) {
      await this.exportRepository.update(requestId, {
        status: ExportStatus.FAILED,
      });
      throw err;
    }
  }

  /**
   * Typed export: transactions for a user, with optional date range.
   */
  async exportTransactions(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<Record<string, unknown>[]> {
    let qb = this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId });
    if (from) qb = qb.andWhere('tx.createdAt >= :from', { from });
    if (to) qb = qb.andWhere('tx.createdAt <= :to', { to });
    const rows = await qb.getMany();
    return rows.map(({ id, type, amount, status, createdAt }) => ({
      id,
      type,
      amount,
      status,
      date: createdAt?.toISOString().slice(0, 10) ?? '',
    }));
  }

  /**
   * Typed export: savings goals for a user.
   */
  async exportGoals(userId: string): Promise<Record<string, unknown>[]> {
    const goals = await this.savingsGoalRepository.find({
      where: { userId },
    });
    return goals.map(({ id, goalName, targetAmount, status, createdAt }) => ({
      id,
      name: goalName,
      targetAmount,
      status,
      createdAt: createdAt?.toISOString().slice(0, 10) ?? '',
    }));
  }

  /**
   * Typed export: portfolio summary (aggregated from transactions + goals).
   */
  async exportPortfolio(userId: string): Promise<Record<string, unknown>[]> {
    const [transactions, goals] = await Promise.all([
      this.transactionRepository.find({ where: { userId } }),
      this.savingsGoalRepository.find({ where: { userId } }),
    ]);
    const totalDeposited = transactions
      .filter((t) => t.type === TxType.DEPOSIT)
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const totalWithdrawn = transactions
      .filter((t) => t.type === TxType.WITHDRAW)
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    return [
      { metric: 'total_deposited', value: totalDeposited },
      { metric: 'total_withdrawn', value: totalWithdrawn },
      { metric: 'net_position', value: totalDeposited - totalWithdrawn },
      {
        metric: 'active_goals',
        value: goals.filter((g) => g.status === SavingsGoalStatus.IN_PROGRESS)
          .length,
      },
      {
        metric: 'completed_goals',
        value: goals.filter((g) => g.status === SavingsGoalStatus.COMPLETED)
          .length,
      },
    ];
  }

  /**
   * Typed export: analytics data (transaction counts by type + date).
   */
  async exportAnalytics(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<Record<string, unknown>[]> {
    let qb = this.transactionRepository
      .createQueryBuilder('tx')
      .select([
        'tx.type AS type',
        'DATE(tx.createdAt) AS date',
        'COUNT(*) AS count',
        'SUM(tx.amount) AS total',
      ])
      .where('tx.userId = :userId', { userId })
      .groupBy('tx.type, DATE(tx.createdAt)')
      .orderBy('DATE(tx.createdAt)', 'ASC');
    if (from) qb = qb.andWhere('tx.createdAt >= :from', { from });
    if (to) qb = qb.andWhere('tx.createdAt <= :to', { to });
    return qb.getRawMany();
  }

  private buildZip(
    outputPath: string,
    files: Record<string, unknown>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      for (const [name, data] of Object.entries(files)) {
        archive.append(JSON.stringify(data, null, 2), { name });
      }

      archive.finalize();
    });
  }
}
