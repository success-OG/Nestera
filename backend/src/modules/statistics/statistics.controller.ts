import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { StatisticsService } from './services/statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import {
  UserGrowthDto,
  TransactionVolumeDto,
  SavingsMetricsDto,
  SystemHealthDto,
  StatisticsOverviewDto,
  StatisticsExportDto,
} from './dto/statistics-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('admin/statistics')
@Controller('admin/statistics')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * Get comprehensive statistics overview
   * Includes user growth, transactions, savings, and system health
   */
  @Get('overview')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive statistics overview' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Granularity of metrics',
  })
  @ApiQuery({
    name: 'compareWith',
    required: false,
    enum: ['previous_period', 'same_period_last_year', 'same_period_last_month'],
    description: 'Compare with a previous period',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Start date for custom range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'End date for custom range (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics overview',
    type: StatisticsOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getOverview(
    @Query() query: StatisticsQueryDto,
  ): Promise<StatisticsOverviewDto> {
    return this.statisticsService.getStatisticsOverview(query);
  }

  /**
   * Get user growth metrics
   * Includes new users, active users, retention, churn, and growth rates
   */
  @Get('users/growth')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user growth statistics' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Granularity of metrics',
  })
  @ApiQuery({
    name: 'compareWith',
    required: false,
    enum: ['previous_period', 'same_period_last_year', 'same_period_last_month'],
    description: 'Compare with a previous period',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'User growth statistics',
    type: UserGrowthDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'No data found for the period' })
  async getUserGrowth(
    @Query() query: StatisticsQueryDto,
  ): Promise<UserGrowthDto> {
    return this.statisticsService.getUserGrowthStatistics(query);
  }

  /**
   * Get transaction volume metrics
   * Includes transaction counts, volumes, success rates, and gas usage
   */
  @Get('transactions/volume')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transaction volume statistics' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Granularity of metrics',
  })
  @ApiQuery({
    name: 'compareWith',
    required: false,
    enum: ['previous_period', 'same_period_last_year', 'same_period_last_month'],
    description: 'Compare with a previous period',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    description: 'Filter by transaction type for drill-down',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction volume statistics',
    type: TransactionVolumeDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'No data found for the period' })
  async getTransactionVolume(
    @Query() query: StatisticsQueryDto,
  ): Promise<TransactionVolumeDto> {
    return this.statisticsService.getTransactionVolumeStatistics(query);
  }

  /**
   * Get savings metrics
   * Includes accounts, TVL, APY distribution, inflows/outflows, and growth rates
   */
  @Get('savings/metrics')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get savings statistics' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Granularity of metrics',
  })
  @ApiQuery({
    name: 'compareWith',
    required: false,
    enum: ['previous_period', 'same_period_last_year', 'same_period_last_month'],
    description: 'Compare with a previous period',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    type: String,
    description: 'Filter by product for drill-down',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Savings statistics',
    type: SavingsMetricsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'No data found for the period' })
  async getSavingsMetrics(
    @Query() query: StatisticsQueryDto,
  ): Promise<SavingsMetricsDto> {
    return this.statisticsService.getSavingsStatistics(query);
  }

  /**
   * Get system health metrics
   * Includes uptime, response times, resource usage, and alerts
   */
  @Get('system/health')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get system health statistics' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'System health statistics',
    type: SystemHealthDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'No data found for the period' })
  async getSystemHealth(
    @Query() query: StatisticsQueryDto,
  ): Promise<SystemHealthDto> {
    return this.statisticsService.getSystemHealthStatistics(query);
  }

  /**
   * Clear statistics cache
   * Useful for forcing regeneration of cached statistics
   */
  @Delete('cache')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear statistics cache' })
  @ApiQuery({
    name: 'pattern',
    required: false,
    type: String,
    description: 'Pattern to match cache keys (optional)',
  })
  @ApiResponse({ status: 204, description: 'Cache cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async clearCache(@Query('pattern') pattern?: string): Promise<void> {
    if (pattern && pattern.length > 100) {
      throw new BadRequestException('Pattern is too long');
    }
    await this.statisticsService.clearCache(pattern);
  }

  /**
   * Export statistics to a specific format
   * Supports JSON, CSV, and XLSX formats
   */
  @Get('export/:dataType')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export statistics data' })
  @ApiParam({
    name: 'dataType',
    enum: ['all', 'users', 'transactions', 'savings', 'health'],
    description: 'Type of data to export',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv', 'xlsx'],
    description: 'Export format',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Exported statistics',
    type: StatisticsExportDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 400, description: 'Invalid export format' })
  async exportStatistics(
    @Param('dataType') dataType: string,
    @Query('format') format: 'json' | 'csv' | 'xlsx',
    @Query() query: StatisticsQueryDto,
  ): Promise<any> {
    const validDataTypes = ['all', 'users', 'transactions', 'savings', 'health'];
    const validFormats = ['json', 'csv', 'xlsx'];

    if (!validDataTypes.includes(dataType)) {
      throw new BadRequestException('Invalid data type');
    }

    if (!validFormats.includes(format)) {
      throw new BadRequestException('Invalid export format');
    }

    // Prepare export based on dataType and format
    // This would call export service in a full implementation
    return {
      format,
      dataType,
      fileName: `statistics_${dataType}_${new Date().toISOString()}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Get drill-down data for a specific metric
   * Allows exploring statistics by subcategories
   */
  @Get('drilldown/:metricType/:category')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get drill-down statistics' })
  @ApiParam({
    name: 'metricType',
    enum: ['users', 'transactions', 'savings'],
    description: 'Type of metric to drill down',
  })
  @ApiParam({
    name: 'category',
    description: 'Category to drill down into',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
    description: 'Time range for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Drill-down statistics',
    schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        breakdown: { type: 'object' },
        total: { type: 'number' },
        percentage: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDrillDownData(
    @Param('metricType') metricType: string,
    @Param('category') category: string,
    @Query() query: StatisticsQueryDto,
  ): Promise<any> {
    const validMetricTypes = ['users', 'transactions', 'savings'];

    if (!validMetricTypes.includes(metricType)) {
      throw new BadRequestException('Invalid metric type');
    }

    // Return drill-down data
    return {
      category,
      breakdown: {},
      total: 0,
      percentage: 0,
    };
  }
}
