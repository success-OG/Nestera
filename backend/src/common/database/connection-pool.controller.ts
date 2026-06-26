import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConnectionPoolService } from './connection-pool.config';
import { ConnectionRetryService } from './connection-retry.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Database Pool')
@Controller('db/pool')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ConnectionPoolController {
  constructor(
    private readonly poolService: ConnectionPoolService,
    private readonly retryService: ConnectionRetryService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get connection pool summary with utilization trends' })
  @ApiResponse({ status: 200, description: 'Pool summary including current metrics, averages, and acquisition latency' })
  getSummary() {
    return this.poolService.getPoolSummary();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get raw connection pool metrics history' })
  getMetrics() {
    return {
      metrics: this.poolService.getMetrics(),
      latest: this.poolService.getLatestMetrics(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check connection pool health' })
  async getHealth() {
    return this.poolService.getHealthStatus();
  }

  @Get('leaks')
  @ApiOperation({ summary: 'Detect potential connection leaks' })
  async detectLeaks() {
    const leaked = await this.poolService.detectConnectionLeaks();
    return { suspectedLeaks: leaked };
  }

  @Post('reconnect')
  @ApiOperation({ summary: 'Force a reconnection health check' })
  async reconnect() {
    const success = await this.retryService.checkAndReconnect();
    return { success, timestamp: new Date().toISOString() };
  }

  @Get('retry-stats')
  @ApiOperation({ summary: 'Get connection retry statistics' })
  getRetryStats() {
    return this.retryService.getRetryStats();
  }
}
