import { Controller, Get, Post, Delete, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheStrategyService } from './cache-strategy.service';
import { CacheWarmingService } from './cache-warming.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Cache')
@Controller('cache')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(
    private readonly cacheStrategy: CacheStrategyService,
    private readonly cacheWarming: CacheWarmingService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get cache hit/miss metrics' })
  getMetrics() {
    return this.cacheStrategy.getMetrics();
  }

  @Get('reset-metrics')
  @ApiOperation({ summary: 'Reset cache metrics' })
  resetMetrics() {
    this.cacheStrategy.resetMetrics();
    return { message: 'Cache metrics reset' };
  }

  @Get('warming-metrics')
  @ApiOperation({ summary: 'Get cache warming metrics' })
  getWarmingMetrics() {
    return this.cacheWarming.getWarmingMetrics();
  }

  @Get('registered-endpoints')
  @ApiOperation({ summary: 'Get registered cacheable endpoints' })
  getRegisteredEndpoints() {
    return this.cacheWarming.getRegisteredEndpoints();
  }

  @Post('warm-all')
  @ApiOperation({ summary: 'Warm all cacheable endpoints manually' })
  async warmAllEndpoints() {
    await this.cacheWarming.warmAllEndpoints();
    return { message: 'Cache warming initiated' };
  }

  @Delete('invalidate/tag/:tag')
  @ApiOperation({ summary: 'Invalidate all cache entries with the given tag' })
  async invalidateByTag(@Param('tag') tag: string) {
    await this.cacheStrategy.invalidateByTag(tag);
    return { message: `Invalidated all keys with tag: ${tag}` };
  }

  @Delete('invalidate/pattern/:pattern')
  @ApiOperation({ summary: 'Invalidate all cache entries matching the given pattern' })
  async invalidateByPattern(@Param('pattern') pattern: string) {
    await this.cacheStrategy.invalidateByPattern(pattern);
    return { message: `Invalidated all keys matching pattern: ${pattern}` };
  }
}
