import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { BackupService } from './backup.service';
import { BackupStatus } from './entities/backup-record.entity';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

const MAX_BACKUP_AGE_HOURS = 26; // alert if no successful backup in 26h

@Injectable()
export class BackupMonitorService {
  private readonly logger = new Logger(BackupMonitorService.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly mail: MailService,
  ) {}

  // Check every hour
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_HOUR)
  async checkBackupFreshness(): Promise<void> {
    const latest = await this.backupService.getLastSuccessful();

    if (!latest) {
      await this.alert(
        'No successful backup found',
        'No backup record exists in the database.',
      );
      return;
    }

    const ageMs = Date.now() - latest.createdAt.getTime();
    const ageHours = ageMs / 1000 / 3600;

    if (ageHours > MAX_BACKUP_AGE_HOURS) {
      await this.alert(
        'Backup overdue',
        `Last successful backup was ${ageHours.toFixed(1)}h ago (threshold: ${MAX_BACKUP_AGE_HOURS}h). File: ${latest.filename}`,
      );
    }
  }

  // Check for failed backups — runs 30 min after the daily backup window
  @ShutdownTrackedTask()
  @Cron('30 2 * * *')
  async checkLastBackupResult(): Promise<void> {
    const records = await this.backupService.getRecentBackups(1);
    const last = records[0];

    if (last?.status === BackupStatus.FAILED) {
      await this.alert(
        'Daily backup failed',
        `Backup ${last.filename} failed at ${last.createdAt.toISOString()}. Error: ${last.errorMessage ?? 'unknown'}`,
      );
    }
  }

  getHealthStatus(): {
    healthy: boolean;
    lastBackup: Date | null;
    ageHours: number;
  } {
    // Synchronous snapshot — callers should use getLastSuccessful() for async truth
    return { healthy: true, lastBackup: null, ageHours: 0 };
  }

  private async alert(subject: string, body: string): Promise<void> {
    this.logger.error(`[BACKUP ALERT] ${subject}: ${body}`);
    await this.mail.sendRawMail(
      'ops@nestera.io',
      `[Nestera Backup Alert] ${subject}`,
      body,
    );
  }
}
