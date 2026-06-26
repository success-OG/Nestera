import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShutdownTrackedTask } from '../decorators/shutdown-task.decorator';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCleanup() {
    this.logger.log('Idempotency cleanup job running...');
    // Note: Since we use Redis with TTL, expired keys are handled automatically by Redis.
    // This job serves as a hook for any additional cleanup or monitoring.
    this.logger.log('Idempotency cleanup completed (Redis TTL handles key expiration).');
  }
}
