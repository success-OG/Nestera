import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { Repository, Between } from 'typeorm';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import * as archiver from 'archiver';
import { StatisticsQueryDto, TimeRange } from '../dto/statistics-query.dto';
import {
  AnalyticsExportArtifactDto,
  AnalyticsExportJobRequestDto,
  AnalyticsExportJobResponseDto,
} from '../dto/analytics-export.dto';
import {
  AnalyticsExportDataType,
  AnalyticsExportFormat,
  AnalyticsExportJob,
  AnalyticsExportStatus,
} from '../entities/analytics-export-job.entity';
import {
  ANALYTICS_EXPORT_FILE_DIR,
  ANALYTICS_EXPORT_JOB_NAME,
  ANALYTICS_EXPORT_LINK_TTL_MS,
  ANALYTICS_EXPORT_QUEUE,
} from '../statistics-export.constants';
import { UserGrowthMetrics } from '../entities/user-growth-metrics.entity';
import { TransactionMetrics } from '../entities/transaction-metrics.entity';
import { SavingsMetrics } from '../entities/savings-metrics.entity';
import { SystemHealthMetrics } from '../entities/system-health-metrics.entity';
import { SystemStatistics } from '../entities/system-statistics.entity';

interface AnalyticsExportSection {
  name: string;
  rows: Record<string, unknown>[];
}

interface AnalyticsExportPayload {
  dataType: AnalyticsExportDataType;
  generatedAt: string;
  range: string;
  fromDate?: string;
  toDate?: string;
  sections: AnalyticsExportSection[];
}

@Injectable()
export class AnalyticsExportService {
  private readonly logger = new Logger(AnalyticsExportService.name);
  private readonly exportDir = path.join(
    os.tmpdir(),
    ANALYTICS_EXPORT_FILE_DIR,
  );

  constructor(
    @InjectRepository(AnalyticsExportJob)
    private readonly exportJobRepository: Repository<AnalyticsExportJob>,
    @InjectRepository(UserGrowthMetrics)
    private readonly userGrowthRepository: Repository<UserGrowthMetrics>,
    @InjectRepository(TransactionMetrics)
    private readonly transactionMetricsRepository: Repository<TransactionMetrics>,
    @InjectRepository(SavingsMetrics)
    private readonly savingsMetricsRepository: Repository<SavingsMetrics>,
    @InjectRepository(SystemHealthMetrics)
    private readonly systemHealthRepository: Repository<SystemHealthMetrics>,
    @InjectRepository(SystemStatistics)
    private readonly systemStatisticsRepository: Repository<SystemStatistics>,
    @InjectQueue(ANALYTICS_EXPORT_QUEUE)
    private readonly exportQueue: Queue,
  ) {
    fs.mkdirSync(this.exportDir, { recursive: true });
  }

  async requestExportJob(
    userId: string,
    dataType: string,
    dto: AnalyticsExportJobRequestDto,
  ): Promise<AnalyticsExportJobResponseDto> {
    const normalizedDataType = this.normalizeDataType(dataType);
    const normalizedFormat = this.normalizeFormat(
      dto.format ?? AnalyticsExportFormat.JSON,
    );
    const [fromDate, toDate] = this.resolveDateRange(dto);

    const job = this.exportJobRepository.create({
      userId,
      dataType: normalizedDataType,
      format: normalizedFormat,
      range: dto.range ?? TimeRange.LAST_30_DAYS,
      fromDate,
      toDate,
      status: AnalyticsExportStatus.PENDING,
      requestPayload: {
        range: dto.range ?? TimeRange.LAST_30_DAYS,
        fromDate: dto.fromDate ?? null,
        toDate: dto.toDate ?? null,
        period: dto.period ?? null,
        filter: dto.filter ?? null,
      },
      expiresAt: new Date(Date.now() + ANALYTICS_EXPORT_LINK_TTL_MS),
    });

    const saved = await this.exportJobRepository.save(job);

    let queueJob;
    try {
      queueJob = await this.exportQueue.add(
        ANALYTICS_EXPORT_JOB_NAME,
        { exportJobId: saved.id },
        {
          jobId: saved.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (error) {
      await this.exportJobRepository.update(saved.id, {
        status: AnalyticsExportStatus.FAILED,
        errorMessage:
          error instanceof Error ? error.message : 'Failed to queue export job',
      });
      throw error;
    }

    await this.exportJobRepository.update(saved.id, {
      queueJobId: String(queueJob.id ?? saved.id),
    });

    return this.toJobResponse({
      ...saved,
      queueJobId: String(queueJob.id ?? saved.id),
    });
  }

  async getExportJobStatus(
    userId: string,
    jobId: string,
  ): Promise<AnalyticsExportJobResponseDto> {
    const job = await this.exportJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    this.assertJobOwnership(job, userId);
    this.assertNotExpired(job);

    return this.toJobResponse(job);
  }

  async getExportJobDownload(
    userId: string,
    jobId: string,
  ): Promise<{
    filePath: string;
    fileName: string;
    contentType: string;
  }> {
    const job = await this.exportJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    this.assertJobOwnership(job, userId);
    this.assertNotExpired(job);

    if (job.status !== AnalyticsExportStatus.COMPLETED) {
      throw new BadRequestException('Export job is not ready for download');
    }

    if (!job.filePath || !fs.existsSync(job.filePath)) {
      throw new NotFoundException('Export file not found');
    }

    return {
      filePath: job.filePath,
      fileName:
        job.fileName ?? this.buildFileName(job.dataType, job.format, job.id),
      contentType: this.getContentType(job.format),
    };
  }

  async exportDirect(
    dataType: string,
    dto: StatisticsQueryDto,
    format: AnalyticsExportFormat,
  ): Promise<AnalyticsExportArtifactDto> {
    const normalizedDataType = this.normalizeDataType(dataType);
    const normalizedFormat = this.normalizeFormat(format);
    const payload = await this.buildPayload(normalizedDataType, dto);

    return this.renderArtifact(payload, normalizedFormat, 'direct-export');
  }

  async processExportJob(jobId: string): Promise<void> {
    const job = await this.exportJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    if (job.status === AnalyticsExportStatus.COMPLETED && job.filePath) {
      return;
    }

    await this.exportJobRepository.update(job.id, {
      status: AnalyticsExportStatus.PROCESSING,
      errorMessage: null,
    });

    try {
      const payload = await this.buildPayload(job.dataType, this.toQuery(job));
      const artifact = await this.renderArtifact(payload, job.format, job.id);
      const filePath = path.join(this.exportDir, artifact.fileName);

      await fs.promises.writeFile(filePath, artifact.buffer);

      await this.exportJobRepository.update(job.id, {
        status: AnalyticsExportStatus.COMPLETED,
        filePath,
        fileName: artifact.fileName,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + ANALYTICS_EXPORT_LINK_TTL_MS),
        errorMessage: null,
      });

      this.logger.log(`Analytics export job ${job.id} completed`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown export error';
      await this.exportJobRepository.update(job.id, {
        status: AnalyticsExportStatus.FAILED,
        errorMessage: message,
      });
      this.logger.error(`Analytics export job ${job.id} failed: ${message}`);
      throw error;
    }
  }

  private async buildPayload(
    dataType: AnalyticsExportDataType,
    query: StatisticsQueryDto,
  ): Promise<AnalyticsExportPayload> {
    const [fromDate, toDate] = this.resolveDateRange(query);
    const sections: AnalyticsExportSection[] = [];

    if (
      dataType === AnalyticsExportDataType.ALL ||
      dataType === AnalyticsExportDataType.USERS
    ) {
      sections.push({
        name: 'users',
        rows: await this.fetchUserGrowthRows(query, fromDate, toDate),
      });
    }

    if (
      dataType === AnalyticsExportDataType.ALL ||
      dataType === AnalyticsExportDataType.TRANSACTIONS
    ) {
      sections.push({
        name: 'transactions',
        rows: await this.fetchTransactionRows(query, fromDate, toDate),
      });
    }

    if (
      dataType === AnalyticsExportDataType.ALL ||
      dataType === AnalyticsExportDataType.SAVINGS
    ) {
      sections.push({
        name: 'savings',
        rows: await this.fetchSavingsRows(query, fromDate, toDate),
      });
    }

    if (
      dataType === AnalyticsExportDataType.ALL ||
      dataType === AnalyticsExportDataType.HEALTH
    ) {
      sections.push({
        name: 'health',
        rows: await this.fetchHealthRows(fromDate, toDate),
      });
    }

    if (dataType === AnalyticsExportDataType.ALL) {
      sections.unshift({
        name: 'overview',
        rows: await this.fetchOverviewRows(fromDate, toDate),
      });
    }

    return {
      dataType,
      generatedAt: new Date().toISOString(),
      range: query.range ?? TimeRange.LAST_30_DAYS,
      fromDate: query.fromDate,
      toDate: query.toDate,
      sections,
    };
  }

  private async fetchUserGrowthRows(
    query: StatisticsQueryDto,
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, unknown>[]> {
    const metrics = await this.userGrowthRepository.find({
      where: {
        date: Between(fromDate, toDate),
        metricPeriod: query.period ?? 'daily',
      },
      order: { date: 'ASC' },
    });

    return metrics.map((metric) =>
      this.serializeRow({
        date: this.toDateOnly(metric.date),
        metricPeriod: metric.metricPeriod,
        totalUsers: metric.totalUsers,
        newUsersCount: metric.newUsersCount,
        activeUsers: metric.activeUsers,
        inactiveUsers: metric.inactiveUsers,
        churnedUsers: metric.churnedUsers,
        retentionRate: metric.retentionRate,
        churnRate: metric.churnRate,
        growthRate: metric.growthRate,
        usersByRegion: metric.usersByRegion ?? {},
        usersByType: metric.usersByType ?? {},
        usersBySegment: metric.usersBySegment ?? {},
      }),
    );
  }

  private async fetchTransactionRows(
    query: StatisticsQueryDto,
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, unknown>[]> {
    const metrics = await this.transactionMetricsRepository.find({
      where: {
        date: Between(fromDate, toDate),
        metricPeriod: query.period ?? 'daily',
      },
      order: { date: 'ASC' },
    });

    return metrics.map((metric) =>
      this.serializeRow({
        date: this.toDateOnly(metric.date),
        metricPeriod: metric.metricPeriod,
        totalTransactions: metric.totalTransactions,
        successfulTransactions: metric.successfulTransactions,
        failedTransactions: metric.failedTransactions,
        pendingTransactions: metric.pendingTransactions,
        totalVolume: metric.totalVolume,
        avgTransactionAmount: metric.avgTransactionAmount,
        minTransactionAmount: metric.minTransactionAmount,
        maxTransactionAmount: metric.maxTransactionAmount,
        successRate: metric.successRate,
        failureRate: metric.failureRate,
        avgGasUsed: metric.avgGasUsed,
        totalGasSpent: metric.totalGasSpent,
        transactionsByType: metric.transactionsByType ?? {},
        transactionsByStatus: metric.transactionsByStatus ?? {},
        volumeByType: metric.volumeByType ?? {},
      }),
    );
  }

  private async fetchSavingsRows(
    query: StatisticsQueryDto,
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, unknown>[]> {
    const metrics = await this.savingsMetricsRepository.find({
      where: {
        date: Between(fromDate, toDate),
        metricPeriod: query.period ?? 'daily',
      },
      order: { date: 'ASC' },
    });

    return metrics.map((metric) =>
      this.serializeRow({
        date: this.toDateOnly(metric.date),
        metricPeriod: metric.metricPeriod,
        totalAccounts: metric.totalAccounts,
        activeAccounts: metric.activeAccounts,
        newAccounts: metric.newAccounts,
        closedAccounts: metric.closedAccounts,
        totalValueLocked: metric.totalValueLocked,
        inflow: metric.inflow,
        outflow: metric.outflow,
        avgApy: metric.avgApy,
        minApy: metric.minApy,
        maxApy: metric.maxApy,
        totalInterestEarned: metric.totalInterestEarned,
        accountGrowthRate: metric.accountGrowthRate,
        tvlGrowthRate: metric.tvlGrowthRate,
        accountsByProduct: metric.accountsByProduct ?? {},
        tvlByProduct: metric.tvlByProduct ?? {},
        apyByProduct: metric.apyByProduct ?? {},
      }),
    );
  }

  private async fetchHealthRows(
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, unknown>[]> {
    const metrics = await this.systemHealthRepository.find({
      where: {
        timestamp: Between(fromDate, toDate),
      },
      order: { timestamp: 'ASC' },
    });

    return metrics.map((metric) =>
      this.serializeRow({
        timestamp: metric.timestamp.toISOString(),
        healthScore: metric.healthScore,
        apiUptime: metric.apiUptime,
        blockchainUptime: metric.blockchainUptime,
        totalRequests: metric.totalRequests,
        successfulRequests: metric.successfulRequests,
        failedRequests: metric.failedRequests,
        avgResponseTime: metric.avgResponseTime,
        p95ResponseTime: metric.p95ResponseTime,
        p99ResponseTime: metric.p99ResponseTime,
        memoryUsed: metric.memoryUsed,
        memoryAvailable: metric.memoryAvailable,
        memoryUsagePercent:
          metric.memoryAvailable > 0
            ? (metric.memoryUsed / metric.memoryAvailable) * 100
            : 0,
        cpuUsage: metric.cpuUsage,
        databaseConnections: metric.databaseConnections,
        cacheHitRate: metric.cacheHitRate,
        diskUsage: metric.diskUsage,
        serviceStatus: metric.serviceStatus ?? {},
        alerts: metric.alerts ?? [],
      }),
    );
  }

  private async fetchOverviewRows(
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, unknown>[]> {
    const metrics = await this.systemStatisticsRepository.find({
      where: {
        timestamp: Between(fromDate, toDate),
      },
      order: { timestamp: 'ASC' },
    });

    return metrics.map((metric) =>
      this.serializeRow({
        timestamp: metric.timestamp.toISOString(),
        metricType: metric.metricType,
        totalUsers: metric.totalUsers,
        activeUsers: metric.activeUsers,
        newUsersCount: metric.newUsersCount,
        totalTransactions: metric.totalTransactions,
        failedTransactions: metric.failedTransactions,
        totalTransactionVolume: metric.totalTransactionVolume,
        avgTransactionAmount: metric.avgTransactionAmount,
        totalSavingsAccounts: metric.totalSavingsAccounts,
        activeSavingsAccounts: metric.activeSavingsAccounts,
        totalValueLocked: metric.totalValueLocked,
        avgApy: metric.avgApy,
        totalMedicalClaims: metric.totalMedicalClaims,
        approvedClaims: metric.approvedClaims,
        totalClaimsAmount: metric.totalClaimsAmount,
        activeDisputes: metric.activeDisputes,
        systemHealthScore: metric.systemHealthScore,
        additionalMetrics: metric.additionalMetrics ?? {},
      }),
    );
  }

  private async renderArtifact(
    payload: AnalyticsExportPayload,
    format: AnalyticsExportFormat,
    fileKey: string,
  ): Promise<AnalyticsExportArtifactDto> {
    const fileName = this.buildFileName(
      payload.dataType,
      format,
      fileKey,
      payload,
    );

    if (format === AnalyticsExportFormat.JSON) {
      const buffer = Buffer.from(JSON.stringify(payload, null, 2));
      return {
        format,
        fileName,
        contentType: 'application/json',
        buffer,
        body: payload,
      };
    }

    if (format === AnalyticsExportFormat.CSV) {
      const csv = this.renderCsv(payload);
      return {
        format,
        fileName,
        contentType: 'text/csv; charset=utf-8',
        buffer: Buffer.from(csv, 'utf8'),
      };
    }

    const buffer = await this.renderXlsx(payload);
    return {
      format,
      fileName,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }

  private renderCsv(payload: AnalyticsExportPayload): string {
    const rows = payload.sections.flatMap((section) =>
      section.rows.map((row) => ({
        section: section.name,
        ...this.flattenRow(row),
      })),
    );

    const headers = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row))),
    );

    if (!headers.includes('section')) {
      headers.unshift('section');
    } else {
      headers.splice(headers.indexOf('section'), 1);
      headers.unshift('section');
    }

    if (rows.length === 0) {
      return `${headers.join(',')}\n`;
    }

    const escapeCell = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const text = String(value);
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((header) => escapeCell(row[header])).join(','));
    }

    return `${lines.join('\n')}\n`;
  }

  private async renderXlsx(payload: AnalyticsExportPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const output = new PassThrough();
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      output.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.pipe(output);

      archive.append(this.buildContentTypesXml(payload.sections.length), {
        name: '[Content_Types].xml',
      });
      archive.append(this.buildRelsXml(), { name: '_rels/.rels' });
      archive.append(this.buildWorkbookXml(payload.sections), {
        name: 'xl/workbook.xml',
      });
      archive.append(this.buildWorkbookRelsXml(payload.sections.length), {
        name: 'xl/_rels/workbook.xml.rels',
      });
      archive.append(this.buildStylesXml(), { name: 'xl/styles.xml' });

      payload.sections.forEach((section, index) => {
        archive.append(this.buildWorksheetXml(section), {
          name: `xl/worksheets/sheet${index + 1}.xml`,
        });
      });

      archive.finalize();
    });
  }

  private buildContentTypesXml(sheetCount: number): string {
    const overrides = Array.from(
      { length: sheetCount },
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
  }

  private buildRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private buildWorkbookXml(sections: AnalyticsExportSection[]): string {
    const sheets = sections
      .map(
        (section, index) =>
          `<sheet name="${this.escapeXml(this.sanitizeSheetName(section.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets}</sheets>
</workbook>`;
  }

  private buildWorkbookRelsXml(sheetCount: number): string {
    const sheetRelationships = Array.from(
      { length: sheetCount },
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRelationships}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  }

  private buildStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <color theme="1"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="1">
    <fill>
      <patternFill patternType="none"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;
  }

  private buildWorksheetXml(section: AnalyticsExportSection): string {
    const rows = section.rows.map((row) => this.flattenRow(row));
    const headers = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row))),
    );
    const allRows = [
      headers.reduce(
        (acc, header) => {
          acc[header] = header;
          return acc;
        },
        {} as Record<string, unknown>,
      ),
      ...rows,
    ];

    const sheetRows = allRows
      .map((row, rowIndex) => {
        const cells = headers
          .map((header, columnIndex) =>
            this.buildCell(columnIndex, rowIndex + 1, row[header]),
          )
          .join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
  }

  private buildCell(
    columnIndex: number,
    rowIndex: number,
    value: unknown,
  ): string {
    const reference = `${this.columnName(columnIndex + 1)}${rowIndex}`;
    if (value === null || value === undefined) {
      return `<c r="${reference}"/>`;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${reference}"><v>${value}</v></c>`;
    }

    if (typeof value === 'boolean') {
      return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
    }

    const text = this.escapeXml(String(value));
    return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
  }

  private flattenRow(row: Record<string, unknown>): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      flattened[key] = this.flattenValue(value);
    }

    return flattened;
  }

  private flattenValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value.map((item) => this.serializeValue(item)));
    }

    if (value && typeof value === 'object') {
      return JSON.stringify(this.serializeValue(value));
    }

    return value;
  }

  private serializeRow<T extends Record<string, unknown>>(row: T): T {
    return this.serializeValue(row) as T;
  }

  private serializeValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([key, nested]) => [key, this.serializeValue(nested)],
        ),
      );
    }

    return value;
  }

  private resolveDateRange(query: StatisticsQueryDto): [Date, Date] {
    const hasExplicitBounds = Boolean(query.fromDate || query.toDate);
    const wantsCustomRange =
      query.range === TimeRange.CUSTOM || hasExplicitBounds;

    if (wantsCustomRange) {
      if (!query.fromDate || !query.toDate) {
        throw new BadRequestException(
          'fromDate and toDate are required when a custom date range is requested',
        );
      }

      const fromDate = new Date(query.fromDate);
      const toDate = new Date(query.toDate);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid custom date range');
      }

      if (fromDate > toDate) {
        throw new BadRequestException('fromDate must be before toDate');
      }

      return [fromDate, toDate];
    }

    const toDate = new Date();
    const fromDate = new Date(toDate);

    switch (query.range ?? TimeRange.LAST_30_DAYS) {
      case TimeRange.LAST_7_DAYS:
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case TimeRange.LAST_30_DAYS:
        fromDate.setDate(fromDate.getDate() - 30);
        break;
      case TimeRange.LAST_90_DAYS:
        fromDate.setDate(fromDate.getDate() - 90);
        break;
      case TimeRange.LAST_365_DAYS:
        fromDate.setDate(fromDate.getDate() - 365);
        break;
      default:
        fromDate.setDate(fromDate.getDate() - 30);
        break;
    }

    return [fromDate, toDate];
  }

  private toQuery(job: AnalyticsExportJob): StatisticsQueryDto {
    const payload = job.requestPayload ?? {};
    const period =
      typeof payload.period === 'string' ? payload.period : 'daily';

    return {
      range: (job.range as TimeRange) ?? TimeRange.LAST_30_DAYS,
      fromDate: job.fromDate?.toISOString(),
      toDate: job.toDate?.toISOString(),
      period: period as StatisticsQueryDto['period'],
      compareWith: undefined,
      filter: undefined,
      page: 1,
      limit: 50,
    };
  }

  private normalizeDataType(dataType: string): AnalyticsExportDataType {
    const normalized = dataType.toLowerCase();
    const valid = Object.values(AnalyticsExportDataType);
    if (!valid.includes(normalized as AnalyticsExportDataType)) {
      throw new BadRequestException('Invalid analytics export data type');
    }
    return normalized as AnalyticsExportDataType;
  }

  private normalizeFormat(format: string): AnalyticsExportFormat {
    const normalized = format.toLowerCase();
    const valid = Object.values(AnalyticsExportFormat);
    if (!valid.includes(normalized as AnalyticsExportFormat)) {
      throw new BadRequestException('Invalid analytics export format');
    }
    return normalized as AnalyticsExportFormat;
  }

  private getContentType(format: AnalyticsExportFormat): string {
    switch (format) {
      case AnalyticsExportFormat.CSV:
        return 'text/csv; charset=utf-8';
      case AnalyticsExportFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/json';
    }
  }

  private buildFileName(
    dataType: AnalyticsExportDataType,
    format: AnalyticsExportFormat,
    fileKey: string,
    payload?: AnalyticsExportPayload,
  ): string {
    const rangeLabel =
      payload?.fromDate && payload?.toDate
        ? `${this.compactDate(payload.fromDate)}_${this.compactDate(payload.toDate)}`
        : 'latest';
    const suffix = format === AnalyticsExportFormat.XLSX ? 'xlsx' : format;
    return `analytics_${dataType}_${rangeLabel}_${fileKey}.${suffix}`;
  }

  private compactDate(dateValue: string): string {
    return dateValue.slice(0, 10).replace(/-/g, '');
  }

  private columnName(index: number): string {
    let value = index;
    let column = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      value = Math.floor((value - 1) / 26);
    }
    return column;
  }

  private sanitizeSheetName(name: string): string {
    return name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet';
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private assertJobOwnership(job: AnalyticsExportJob, userId: string): void {
    if (job.userId !== userId) {
      throw new ForbiddenException('You do not have access to this export job');
    }
  }

  private assertNotExpired(job: AnalyticsExportJob): void {
    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      throw new GoneException('Export job has expired');
    }
  }

  private toDateOnly(dateValue: Date): string {
    return dateValue.toISOString().slice(0, 10);
  }

  private toJobResponse(
    job: AnalyticsExportJob,
  ): AnalyticsExportJobResponseDto {
    return {
      requestId: job.id,
      status: job.status,
      dataType: job.dataType,
      format: job.format,
      fileName: job.fileName ?? undefined,
      filePath: job.filePath ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
      expiresAt: job.expiresAt ?? null,
    };
  }
}
