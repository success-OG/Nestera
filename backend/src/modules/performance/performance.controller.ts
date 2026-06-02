import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueryLoggerService } from './query-logger.service';
import { CompressionMetricsService } from '../../common/services/compression-metrics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(
    private readonly queryLogger: QueryLoggerService,
    private readonly compressionMetricsService: CompressionMetricsService,
  ) {}

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow queries exceeding 100ms' })
  getSlowQueries(@Query('limit') limit: number = 50) {
    return {
      queries: this.queryLogger.getSlowQueries(limit),
      stats: this.queryLogger.getQueryStats(),
    };
  }

  @Get('query-stats')
  @ApiOperation({ summary: 'Get query performance statistics' })
  getQueryStats() {
    return this.queryLogger.getQueryStats();
  }

  @Get('n-plus-one')
  @ApiOperation({ summary: 'Detect N+1 query patterns' })
  detectNPlusOne() {
    return this.queryLogger.detectNPlusOne();
  }

  @Get('index-suggestions')
  @ApiOperation({ summary: 'Get automatic index suggestions' })
  getIndexSuggestions() {
    return {
      suggestions: this.queryLogger.suggestIndexes(),
    };
  }

  @Get('compression')
  @ApiOperation({ summary: 'Get API response compression metrics' })
  getCompressionMetrics() {
    return this.compressionMetricsService.getMetrics();
  }
}
