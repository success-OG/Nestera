import { Module, Global } from '@nestjs/common';
import { ApmService } from './apm.service';
import { MetricsService } from './metrics.service';
import { DistributedTracingService } from './distributed-tracing.service';
import { ApmController } from './apm.controller';
import { ApmInterceptor } from './apm.interceptor';

@Global()
@Module({
  controllers: [ApmController],
  providers: [ApmService, MetricsService, DistributedTracingService, ApmInterceptor],
  exports: [ApmService, MetricsService, DistributedTracingService, ApmInterceptor],
})
export class ApmModule {}
