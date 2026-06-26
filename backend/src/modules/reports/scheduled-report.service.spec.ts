import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduledReportService } from './scheduled-report.service';
import {
  ReportSchedule,
  ReportArchive,
  ReportType,
  ReportFormat,
  ReportScheduleFrequency,
  ReportScheduleStatus,
} from './entities/report-schedule.entity';
import { ReportsService } from './reports.service';
import { User } from '../user/entities/user.entity';
import { MailService } from '../mail/mail.service';

const mockRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ScheduledReportService', () => {
  let service: ScheduledReportService;
  let scheduleRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    scheduleRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledReportService,
        { provide: getRepositoryToken(ReportSchedule), useValue: scheduleRepo },
        { provide: getRepositoryToken(ReportArchive), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        {
          provide: ReportsService,
          useValue: {
            generateTaxReportCSV: jest.fn(),
            generatePdfBufferFromText: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: { sendReportEmail: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ScheduledReportService>(ScheduledReportService);
  });

  describe('createSchedule', () => {
    it('creates an active schedule', async () => {
      const dto = {
        reportType: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        frequency: ReportScheduleFrequency.DAILY,
      };
      scheduleRepo.save.mockResolvedValue({ id: 'sched-1', ...dto });

      const result = await service.createSchedule('user-1', dto);
      expect(result.id).toBe('sched-1');
      expect(scheduleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReportScheduleStatus.ACTIVE }),
      );
    });
  });

  describe('pauseSchedule', () => {
    it('pauses schedule', async () => {
      scheduleRepo.findOne.mockResolvedValue({
        id: 's1',
        userId: 'u1',
        status: ReportScheduleStatus.ACTIVE,
      });
      scheduleRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.pauseSchedule('s1', 'u1');
      expect(result.status).toBe(ReportScheduleStatus.PAUSED);
    });

    it('throws when not found', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);
      await expect(service.pauseSchedule('bad', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('computeNextRun', () => {
    it('adds 1 day for DAILY', () => {
      const from = new Date('2026-06-01T12:00:00Z');
      const next = service.computeNextRun(ReportScheduleFrequency.DAILY, from);
      expect(next.getDate()).toBe(2);
      expect(next.getHours()).toBe(8);
    });
  });
});
