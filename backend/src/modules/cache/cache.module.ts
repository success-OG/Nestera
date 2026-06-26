import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { ConfigService } from '@nestjs/config';
import { CacheStrategyService } from './cache-strategy.service';
import { CacheController } from './cache.controller';
import { CacheWarmingService } from './cache-warming.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
          return {
            store: redisStore,
            url: redisUrl,
            ttl: 5 * 60 * 1000, // 5 minutes default
          };
        }

        // Fallback to in-memory cache
        return {
          ttl: 5 * 60 * 1000,
        };
      },
    }),
  ],
  providers: [CacheStrategyService, CacheWarmingService],
  controllers: [CacheController],
  exports: [CacheStrategyService, NestCacheModule, CacheWarmingService],
})
export class CacheModule {}
