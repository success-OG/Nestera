import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { format as csvFormat } from '@fast-csv/format';
import {
  ReportArchive,
  ReportArchiveStatus,
  ReportFormat,
  ReportSchedule,
  ReportScheduleFrequency,
  ReportScheduleStatus,
  ReportType,
} from './entities/report-schedule.entity';
import { CreateReportScheduleDto } from './dto/report-schedule.dto';
import { ReportsService } from './reports.service';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class ScheduledReportService {
  private readonly logger = new Logger(ScheduledReportService.name);
  private readonly archiveDir: string;

  constructor(
    @InjectRepository(ReportSchedule)
    private readonly scheduleRepo: Repository<ReportSchedule>,
    @InjectRepository(ReportArchive)
    private readonly archiveRepo: Repository<ReportArchive>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly reportsService: ReportsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.archiveDir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'report-archives',
    );
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  async createSchedule(
    userId: string,
    dto: CreateReportScheduleDto,
  ): Promise<ReportSchedule> {
    const schedule = this.scheduleRepo.create({
      userId,
      reportType: dto.reportType,
      format: dto.format,
      frequency: dto.frequency,
      emailDelivery: dto.emailDelivery ?? true,
      status: ReportScheduleStatus.ACTIVE,
      nextRunAt: this.computeNextRun(dto.frequency),
    });
    return this.scheduleRepo.save(schedule);
  }

  async listSchedules(userId: string): Promise<ReportSchedule[]> {
    return this.scheduleRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async pauseSchedule(id: string, userId: string): Promise<ReportSchedule> {
    const schedule = await this.findOwned(id, userId);
    schedule.status = ReportScheduleStatus.PAUSED;
    return this.scheduleRepo.save(schedule);
  }

  async cancelSchedule(id: string, userId: string): Promise<void> {
    const schedule = await this.findOwned(id, userId);
    schedule.status = ReportScheduleStatus.CANCELLED;
    await this.scheduleRepo.save(schedule);
  }

  async listArchives(userId: string): Promise<ReportArchive[]> {
    return this.archiveRepo.find({
      where: { userId },
      order: { generatedAt: 'DESC' },
    });
  }

  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_HOUR)
  async processDueSchedules(): Promise<void> {
    const now = new Date();
    const due = await this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: ReportScheduleStatus.ACTIVE })
      .andWhere('s.nextRunAt <= :now', { now })
      .getMany();

    for (const schedule of due) {
      await this.generateAndArchive(schedule);
    }
  }

  async generateAndArchive(schedule: ReportSchedule): Promise<ReportArchive> {
    const user = await this.userRepo.findOne({
      where: { id: schedule.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found for schedule');
    }

    const year = new Date().getFullYear();
    const periodLabel = this.buildPeriodLabel(schedule);

    try {
      const { buffer, filename, ext } = await this.generateReportBuffer(
        schedule,
        user.id,
        year,
        periodLabel,
      );

      const storagePath = path.join(this.archiveDir, filename);
      fs.writeFileSync(storagePath, buffer);

      const archive = this.archiveRepo.create({
        userId: schedule.userId,
        scheduleId: schedule.id,
        reportType: schedule.reportType,
        format: schedule.format,
        storagePath,
        filename,
        status: ReportArchiveStatus.GENERATED,
        periodLabel,
      });
      const saved = await this.archiveRepo.save(archive);

      if (schedule.emailDelivery && user.email) {
        await this.mailService.sendReportEmail(
          user.email,
          user.name ?? 'User',
          schedule.reportType,
          periodLabel,
          buffer,
          `${filename}${ext}`,
        );
        saved.status = ReportArchiveStatus.DELIVERED;
        await this.archiveRepo.save(saved);
      }

      schedule.nextRunAt = this.computeNextRun(schedule.frequency);
      await this.scheduleRepo.save(schedule);

      this.logger.log(`Report generated for schedule ${schedule.id}`);
      return saved;
    } catch (error) {
      const archive = this.archiveRepo.create({
        userId: schedule.userId,
        scheduleId: schedule.id,
        reportType: schedule.reportType,
        format: schedule.format,
        storagePath: '',
        filename: `failed-${Date.now()}`,
        status: ReportArchiveStatus.FAILED,
        periodLabel,
      });
      await this.archiveRepo.save(archive);
      throw error;
    }
  }

  private async generateReportBuffer(
    schedule: ReportSchedule,
    userId: string,
    year: number,
    periodLabel: string,
  ): Promise<{ buffer: Buffer; filename: string; ext: string }> {
    const baseName = `${schedule.reportType.toLowerCase()}_${userId}_${periodLabel.replace(/\s/g, '_')}`;

    switch (schedule.format) {
      case ReportFormat.PDF: {
        const lines = await this.buildReportLines(schedule, userId, year);
        const buffer = await this.reportsService.generatePdfBufferFromText(
          `${schedule.reportType} — ${periodLabel}`,
          lines,
        );
        return { buffer, filename: `${baseName}.pdf`, ext: '.pdf' };
      }
      case ReportFormat.EXCEL:
      case ReportFormat.CSV: {
        const rows = await this.buildReportRows(schedule, userId, year);
        const buffer = await this.generateCsvBuffer(rows);
        const ext = schedule.format === ReportFormat.EXCEL ? '.xlsx' : '.csv';
        return { buffer, filename: `${baseName}${ext}`, ext };
      }
    }
  }

  private async buildReportLines(
    schedule: ReportSchedule,
    userId: string,
    year: number,
  ): Promise<string[]> {
    const csvBuf = await this.reportsService.generateTaxReportCSV(userId, year);
    const lines = csvBuf.toString().split('\n').filter(Boolean);
    return [
      `Report Type: ${schedule.reportType}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      ...lines,
    ];
  }

  private async buildReportRows(
    schedule: ReportSchedule,
    userId: string,
    year: number,
  ): Promise<Record<string, string | number>[]> {
    const csvBuf = await this.reportsService.generateTaxReportCSV(userId, year);
    const rows = csvBuf.toString().split('\n').filter(Boolean);
    const header = (rows[0] ?? '').split(',');
    return rows.slice(1).map((row) => {
      const values = row.split(',');
      const record: Record<string, string | number> = {
        reportType: schedule.reportType,
      };
      header.forEach((key, idx) => {
        record[key] = values[idx] ?? '';
      });
      return record;
    });
  }

  private generateCsvBuffer(
    rows: Record<string, string | number>[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = csvFormat({ headers: true });
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      rows.forEach((row) => stream.write(row));
      stream.end();
    });
  }

  private buildPeriodLabel(schedule: ReportSchedule): string {
    const now = new Date();
    switch (schedule.frequency) {
      case ReportScheduleFrequency.DAILY:
        return now.toISOString().slice(0, 10);
      case ReportScheduleFrequency.WEEKLY:
        return `week-${this.getWeekNumber(now)}-${now.getFullYear()}`;
      case ReportScheduleFrequency.MONTHLY:
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      default:
        return now.toISOString().slice(0, 10);
    }
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  }

  private async findOwned(id: string, userId: string): Promise<ReportSchedule> {
    const schedule = await this.scheduleRepo.findOne({ where: { id, userId } });
    if (!schedule) {
      throw new NotFoundException(`Report schedule ${id} not found`);
    }
    return schedule;
  }

  computeNextRun(frequency: ReportScheduleFrequency, from = new Date()): Date {
    const next = new Date(from);
    switch (frequency) {
      case ReportScheduleFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        next.setHours(8, 0, 0, 0);
        break;
      case ReportScheduleFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        next.setHours(8, 0, 0, 0);
        break;
      case ReportScheduleFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(8, 0, 0, 0);
        break;
    }
    return next;
  }
}
