import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheConfig {
  ttl: number; // milliseconds
  key: string;
  tags?: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  keyMetrics: Map<string, { hits: number; misses: number; sets: number }>;
}

@Injectable()
export class CacheStrategyService {
  private readonly logger = new Logger(CacheStrategyService.name);
  private metrics: CacheMetrics = { 
    hits: 0, 
    misses: 0, 
    sets: 0, 
    deletes: 0, 
    keyMetrics: new Map() 
  };
  private resourceTTLs = new Map<string, number>([
    ['user', 5 * 60 * 1000], // 5 minutes
    ['savings', 10 * 60 * 1000], // 10 minutes
    ['analytics', 30 * 60 * 1000], // 30 minutes
    ['blockchain', 2 * 60 * 1000], // 2 minutes
  ]);
  private tagKeys = new Map<string, Set<string>>();

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.metrics.hits++;
        this.updateKeyMetrics(key, 'hits');
        this.logger.debug(`Cache hit: ${key}`);
      } else {
        this.metrics.misses++;
        this.updateKeyMetrics(key, 'misses');
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    try {
      const finalTTL = ttl || this.getDefaultTTL(key);
      await this.cacheManager.set(key, value, finalTTL);
      this.metrics.sets++;
      this.updateKeyMetrics(key, 'sets');
      
      if (tags) {
        for (const tag of tags) {
          if (!this.tagKeys.has(tag)) {
            this.tagKeys.set(tag, new Set());
          }
          this.tagKeys.get(tag)!.add(key);
        }
      }
      
      this.logger.debug(`Cache set: ${key} (TTL: ${finalTTL}ms)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.metrics.deletes++;
      
      // Remove key from all tag sets
      for (const [, keys] of this.tagKeys) {
        keys.delete(key);
      }
      
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keysToDelete = this.tagKeys.get(tag) || new Set();
      
      for (const key of keysToDelete) {
        await this.del(key);
      }
      
      this.tagKeys.delete(tag);
      
      this.logger.debug(
        `Invalidated ${keysToDelete.size} keys with tag: ${tag}`,
      );
    } catch (error) {
      this.logger.error(`Cache invalidation error for tag ${tag}:`, error);
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // This is a fallback for implementations that don't support pattern matching
      // For Redis, we'd use KEYS or SCAN
      const allKeys = Array.from(this.tagKeys.values()).flatMap(set => Array.from(set));
      const uniqueKeys = new Set(allKeys);
      
      const keysToDelete = Array.from(uniqueKeys).filter(k => k.includes(pattern));
      
      for (const key of keysToDelete) {
        await this.del(key);
      }
      
      this.logger.debug(
        `Invalidated ${keysToDelete.length} keys with pattern: ${pattern}`,
      );
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }

  async warmCache(
    key: string,
    loader: () => Promise<any>,
    ttl?: number,
    tags?: string[],
  ): Promise<void> {
    try {
      const data = await loader();
      await this.set(key, data, ttl, tags);
      this.logger.log(`Cache warmed: ${key}`);
    } catch (error) {
      this.logger.error(`Cache warming error for key ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number,
    tags?: string[],
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const data = await loader();
    await this.set(key, data, ttl, tags);
    return data;
  }

  async staleWhileRevalidate<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number,
    staleTime: number,
    tags?: string[],
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const data = await loader();
    await this.set(key, data, ttl + staleTime, tags);
    return data;
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const keyMetricsArray = Array.from(this.metrics.keyMetrics.entries()).map(([key, km]) => ({
      key,
      ...km,
      hitRate: (km.hits + km.misses) > 0 
        ? ((km.hits / (km.hits + km.misses)) * 100).toFixed(2) + '%' 
        : '0%',
    }));
    
    return {
      ...this.metrics,
      keyMetrics: keyMetricsArray,
      hitRate: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  }

  resetMetrics() {
    this.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0, keyMetrics: new Map() };
  }

  setResourceTTL(resource: string, ttl: number): void {
    this.resourceTTLs.set(resource, ttl);
  }

  private getDefaultTTL(key: string): number {
    for (const [resource, ttl] of this.resourceTTLs) {
      if (key.includes(resource)) {
        return ttl;
      }
    }
    return 5 * 60 * 1000; // default 5 minutes
  }

  private updateKeyMetrics(key: string, type: 'hits' | 'misses' | 'sets') {
    if (!this.metrics.keyMetrics.has(key)) {
      this.metrics.keyMetrics.set(key, { hits: 0, misses: 0, sets: 0 });
    }
    const km = this.metrics.keyMetrics.get(key)!;
    km[type]++;
  }
}
