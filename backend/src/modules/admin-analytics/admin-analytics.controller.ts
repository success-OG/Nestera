import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsOverviewDto } from './dto/analytics-overview.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import {
  DateRangeFilterDto,
  DateRange,
} from '../admin/dto/admin-analytics.dto';

@ApiTags('admin/analytics')
@Controller('admin/analytics')
@UseGuards(RolesGuard)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard analytics overview' })
  @ApiResponse({
    status: 200,
    description: 'Analytics overview',
    type: AnalyticsOverviewDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getOverview(): Promise<AnalyticsOverviewDto> {
    return await this.analyticsService.getOverview();
  }

  @Get('platform')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive platform overview' })
  @ApiResponse({ status: 200, description: 'Platform overview' })
  async getPlatformOverview() {
    return await this.analyticsService.getPlatformOverview();
  }

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user growth, retention, churn metrics' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({
    name: 'compareTo',
    required: false,
    enum: ['previous_period', 'same_period_last_year'],
  })
  @ApiResponse({ status: 200, description: 'User analytics' })
  async getUserAnalytics(@Query() filter: DateRangeFilterDto) {
    return await this.analyticsService.getUserAnalytics(filter);
  }

  @Get('revenue')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get fee collection and projections' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Revenue analytics' })
  async getRevenueAnalytics(@Query() filter: DateRangeFilterDto) {
    return await this.analyticsService.getRevenueAnalytics(filter);
  }

  @Get('savings')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TVL, APY distribution, product performance' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Savings analytics' })
  async getSavingsAnalytics(@Query() filter: DateRangeFilterDto) {
    return await this.analyticsService.getSavingsAnalytics(filter);
  }

  @Get('transactions')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction volume trends' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '365d', 'custom'],
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Transaction analytics' })
  async getTransactionAnalytics(@Query() filter: DateRangeFilterDto) {
    return await this.analyticsService.getTransactionAnalytics(filter);
  }
}
