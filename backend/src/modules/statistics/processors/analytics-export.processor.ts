import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import {
  ANALYTICS_EXPORT_JOB_NAME,
  ANALYTICS_EXPORT_QUEUE,
} from '../statistics-export.constants';
import { AnalyticsExportService } from '../services/analytics-export.service';

@Injectable()
@Processor(ANALYTICS_EXPORT_QUEUE)
export class AnalyticsExportProcessor {
  constructor(
    private readonly analyticsExportService: AnalyticsExportService,
  ) {}

  @Process(ANALYTICS_EXPORT_JOB_NAME)
  async handle(job: Job<{ exportJobId: string }>): Promise<void> {
    await this.analyticsExportService.processExportJob(job.data.exportJobId);
  }
}
