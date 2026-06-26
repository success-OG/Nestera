import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getResponse(key: string, userId: string): Promise<any | null> {
    const fullKey = this.getFullKey(key, userId);
    return await this.cacheManager.get(fullKey);
  }

  async saveResponse(key: string, userId: string, response: any): Promise<void> {
    const fullKey = this.getFullKey(key, userId);
    await this.cacheManager.set(fullKey, response, this.TTL);
  }

  async isProcessing(key: string, userId: string): Promise<boolean> {
    const lockKey = this.getLockKey(key, userId);
    const processing = await this.cacheManager.get(lockKey);
    return !!processing;
  }

  async setProcessing(key: string, userId: string): Promise<void> {
    const lockKey = this.getLockKey(key, userId);
    await this.cacheManager.set(lockKey, true, 30000); // 30 seconds lock
  }

  async removeProcessing(key: string, userId: string): Promise<void> {
    const lockKey = this.getLockKey(key, userId);
    await this.cacheManager.del(lockKey);
  }

  private getFullKey(key: string, userId: string): string {
    return `idempotency:res:${userId}:${key}`;
  }

  private getLockKey(key: string, userId: string): string {
    return `idempotency:lock:${userId}:${key}`;
  }
}
