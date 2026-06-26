import {
  Controller,
  Get,
  Query,
  Param,
  Header,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApmService } from './apm.service';
import { MetricsService } from './metrics.service';
import { DistributedTracingService } from './distributed-tracing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('APM')
@Controller('apm')
export class ApmController {
  constructor(
    private readonly apmService: ApmService,
    private readonly metricsService: MetricsService,
    private readonly tracingService: DistributedTracingService,
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus-compatible metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus text format' })
  getPrometheusMetrics(): string {
    return this.metricsService.getMetricsAsPrometheusText();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'APM dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data with metrics, errors, and traces' })
  getDashboard() {
    return this.apmService.getDashboardData();
  }

  @Get('errors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Error tracking summary' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of errors to return' })
  getErrors(@Query('limit') limit = 50) {
    return {
      errors: this.apmService.getErrorSummary().slice(0, Number(limit)),
      topErrors: this.apmService.getTopErrors(10),
    };
  }

  @Get('traces')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Recent distributed traces' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTraces(@Query('limit') limit = 100) {
    return {
      active: this.tracingService.getActiveSpans(),
      recent: this.tracingService.getRecentSpans(Number(limit)),
      stats: this.tracingService.getTracingStats(),
    };
  }

  @Get('traces/:traceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get spans for a specific trace' })
  getTrace(@Param('traceId') traceId: string) {
    return {
      traceId,
      spans: this.tracingService.getTraceById(traceId),
    };
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Alert rules and recent fired alerts' })
  getAlerts(@Query('limit') limit = 50) {
    return {
      rules: this.apmService.getAlertRules(),
      history: this.apmService.getAlertHistory(Number(limit)),
    };
  }

  @Get('metrics/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'JSON metrics summary with percentiles' })
  getMetricsSummary() {
    return this.metricsService.getMetricsSummary();
  }
}
