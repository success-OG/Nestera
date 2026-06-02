import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { SandboxApiKey } from './entities/sandbox-api-key.entity';
import { SandboxUsageAnalytics } from './entities/sandbox-usage-analytics.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(
    @InjectRepository(SandboxApiKey)
    private sandboxApiKeyRepository: Repository<SandboxApiKey>,
    @InjectRepository(SandboxUsageAnalytics)
    private sandboxUsageAnalyticsRepository: Repository<SandboxUsageAnalytics>,
    private dataSource: DataSource,
  ) {}

  async createApiKey(name: string, userId?: string): Promise<SandboxApiKey> {
    const key = `sb_${uuidv4()}`;
    const apiKey = this.sandboxApiKeyRepository.create({
      key,
      name,
      userId,
      isActive: true,
    });
    return this.sandboxApiKeyRepository.save(apiKey);
  }

  async getApiKeys(userId?: string): Promise<SandboxApiKey[]> {
    const query = this.sandboxApiKeyRepository.createQueryBuilder('key');
    if (userId) {
      query.where('key.userId = :userId', { userId });
    }
    return query.getMany();
  }

  async validateApiKey(key: string): Promise<SandboxApiKey | null> {
    const apiKey = await this.sandboxApiKeyRepository.findOne({
      where: { key, isActive: true },
    });
    if (apiKey) {
      apiKey.lastUsedAt = new Date();
      apiKey.requestCount += 1;
      await this.sandboxApiKeyRepository.save(apiKey);
    }
    return apiKey;
  }

  async trackUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    userAgent?: string,
  ): Promise<void> {
    const analytics = this.sandboxUsageAnalyticsRepository.create({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      userAgent,
    });
    await this.sandboxUsageAnalyticsRepository.save(analytics);
  }

  async getUsageAnalytics(apiKeyId?: string): Promise<SandboxUsageAnalytics[]> {
    const query =
      this.sandboxUsageAnalyticsRepository.createQueryBuilder('analytics');
    if (apiKeyId) {
      query.where('analytics.apiKeyId = :apiKeyId', { apiKeyId });
    }
    return query.orderBy('analytics.createdAt', 'DESC').getMany();
  }

  async resetSandboxData(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Resetting sandbox data...');

      await queryRunner.query('TRUNCATE TABLE users CASCADE');

      await queryRunner.commitTransaction();
      this.logger.log('Sandbox data reset completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to reset sandbox data:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
