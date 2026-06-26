import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  Like,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import {
  AuditLog,
  AuditAction,
  AuditResourceType,
} from '../../common/entities/audit-log.entity';
import {
  AuditLogFilterDto,
  AuditLogExportDto,
} from './dto/admin-audit-log.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAuditLogsService {
  private readonly logger = new Logger(AdminAuditLogsService.name);
  private readonly RETENTION_DAYS: number;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly configService: ConfigService,
  ) {
    this.RETENTION_DAYS =
      this.configService.get<number>('audit.retentionDays') || 90;
  }

  /**
   * Find all audit logs with filters and pagination
   */
  async findAll(
    filters: AuditLogFilterDto,
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.auditLogRepository.createQueryBuilder('auditLog');

    if (filters.actor) {
      query.andWhere('auditLog.actor LIKE :actor', {
        actor: `%${filters.actor}%`,
      });
    }

    if (filters.action) {
      query.andWhere('auditLog.action = :action', { action: filters.action });
    }

    if (filters.resourceType) {
      query.andWhere('auditLog.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters.resourceId) {
      query.andWhere('auditLog.resourceId = :resourceId', {
        resourceId: filters.resourceId,
      });
    }

    if (filters.fromDate) {
      query.andWhere('auditLog.timestamp >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      query.andWhere('auditLog.timestamp <= :toDate', {
        toDate: filters.toDate,
      });
    }

    query.orderBy('auditLog.timestamp', 'DESC');
    query.skip(skip).take(limit);

    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single audit log by ID
   */
  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOne({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Export audit logs to CSV or JSON format
   */
  async exportLogs(
    filters: AuditLogExportDto,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    const query = this.auditLogRepository.createQueryBuilder('auditLog');

    if (filters.actor) {
      query.andWhere('auditLog.actor LIKE :actor', {
        actor: `%${filters.actor}%`,
      });
    }

    if (filters.action) {
      query.andWhere('auditLog.action = :action', { action: filters.action });
    }

    if (filters.resourceType) {
      query.andWhere('auditLog.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters.resourceId) {
      query.andWhere('auditLog.resourceId = :resourceId', {
        resourceId: filters.resourceId,
      });
    }

    if (filters.fromDate) {
      query.andWhere('auditLog.timestamp >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      query.andWhere('auditLog.timestamp <= :toDate', {
        toDate: filters.toDate,
      });
    }

    query.orderBy('auditLog.timestamp', 'DESC');

    // Limit export to 10,000 records
    query.take(10000);

    const logs = await query.getMany();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV export
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Actor',
      'Resource Type',
      'Resource ID',
      'Endpoint',
      'Method',
      'Status Code',
      'Success',
      'Duration (ms)',
      'IP Address',
      'User Agent',
      'Description',
      'Previous Value',
      'New Value',
    ];

    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.timestamp.toISOString(),
        log.action || '',
        log.actor || '',
        log.resourceType || '',
        log.resourceId || '',
        log.endpoint || '',
        log.method || '',
        log.statusCode?.toString() || '',
        log.success ? 'true' : 'false',
        log.durationMs?.toString() || '',
        log.ipAddress || '',
        log.userAgent ? `"${log.userAgent.replace(/"/g, '""')}"` : '',
        log.description ? `"${log.description.replace(/"/g, '""')}"` : '',
        log.previousValue
          ? `"${JSON.stringify(log.previousValue).replace(/"/g, '""')}"`
          : '',
        log.newValue
          ? `"${JSON.stringify(log.newValue).replace(/"/g, '""')}"`
          : '',
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Get audit log statistics
   */
  async getStats(
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    byActor: { actor: string; count: number }[];
    successRate: number;
  }> {
    const query = this.auditLogRepository.createQueryBuilder('auditLog');

    if (fromDate) {
      query.andWhere('auditLog.timestamp >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('auditLog.timestamp <= :toDate', { toDate });
    }

    const logs = await query.getMany();
    const totalLogs = logs.length;

    // Count by action
    const byAction: Record<string, number> = {};
    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    }

    // Count by resource type
    const byResourceType: Record<string, number> = {};
    for (const log of logs) {
      byResourceType[log.resourceType] =
        (byResourceType[log.resourceType] || 0) + 1;
    }

    // Top actors
    const actorCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.actor) {
        actorCounts[log.actor] = (actorCounts[log.actor] || 0) + 1;
      }
    }

    const byActor = Object.entries(actorCounts)
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Success rate
    const successCount = logs.filter((l) => l.success).length;
    const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 0;

    return {
      totalLogs,
      byAction,
      byResourceType,
      byActor,
      successRate,
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   * This should be run as a scheduled task
   */
  async cleanupOldLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;
    this.logger.log(
      `Cleaned up ${deletedCount} audit logs older than ${this.RETENTION_DAYS} days`,
    );

    return deletedCount;
  }

  /**
   * Get retention policy info
   */
  getRetentionPolicy(): { retentionDays: number; configured: boolean } {
    return {
      retentionDays: this.RETENTION_DAYS,
      configured:
        this.configService.get<number>('audit.retentionDays') !== undefined,
    };
  }
}
