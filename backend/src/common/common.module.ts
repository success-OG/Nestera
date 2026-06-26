import { Global, Module } from '@nestjs/common';
import { PiiEncryptionService } from './services/pii-encryption.service';
import { RateLimitMonitorService } from './services/rate-limit-monitor.service';
import { SecretsConfigService } from './services/secrets-config.service';

@Global()
@Module({
  providers: [
    RateLimitMonitorService,
    PiiEncryptionService,
    SecretsConfigService,
  ],
  exports: [
    RateLimitMonitorService,
    PiiEncryptionService,
    SecretsConfigService,
  ],
})
export class CommonModule {}
