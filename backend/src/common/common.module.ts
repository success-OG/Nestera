import { Global, Module } from '@nestjs/common';
import { PiiEncryptionService } from './services/pii-encryption.service';
import { RateLimitMonitorService } from './services/rate-limit-monitor.service';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyCleanupService } from './services/idempotency-cleanup.service';
import { LogSanitizerService } from './services/log-sanitizer.service';
import { CompressionMetricsService } from './services/compression-metrics.service';
import { CompressionMetricsMiddleware } from './middleware/compression.middleware';
import { CacheModule } from '../modules/cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [
    RateLimitMonitorService,
    PiiEncryptionService,
    IdempotencyService,
    IdempotencyCleanupService,
    LogSanitizerService,
    CompressionMetricsService,
    CompressionMetricsMiddleware,
  ],
  exports: [
    RateLimitMonitorService,
    PiiEncryptionService,
    IdempotencyService,
    LogSanitizerService,
    CompressionMetricsService,
  ],
})
export class CommonModule {}
