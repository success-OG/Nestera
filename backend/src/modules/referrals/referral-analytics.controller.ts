import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ReferralAnalyticsService } from './referral-analytics.service';
import {
  ConversionFunnelDto,
  CampaignPerformanceDto,
  LeaderboardEntryDto,
  LeaderboardQueryDto,
  ReferralAnalyticsDashboardDto,
  ReferralAnalyticsQueryDto,
  RevenueAttributionDto,
} from './dto/referral-analytics.dto';

@ApiTags('admin/referrals/analytics')
@Controller('admin/referrals/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class ReferralAnalyticsController {
  constructor(private readonly analyticsService: ReferralAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Aggregated referral campaign analytics dashboard' })
  @ApiResponse({ status: 200, type: ReferralAnalyticsDashboardDto })
  getDashboard(): Promise<ReferralAnalyticsDashboardDto> {
    return this.analyticsService.getDashboard();
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Referral conversion funnel metrics' })
  @ApiResponse({ status: 200, type: ConversionFunnelDto })
  getFunnel(
    @Query() query: ReferralAnalyticsQueryDto,
  ): Promise<ConversionFunnelDto> {
    return this.analyticsService.getConversionFunnel(query.campaignId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue attribution and ROI metrics' })
  @ApiResponse({ status: 200, type: RevenueAttributionDto })
  getRevenue(
    @Query() query: ReferralAnalyticsQueryDto,
  ): Promise<RevenueAttributionDto> {
    return this.analyticsService.getRevenueAttribution(query.campaignId);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Per-campaign performance dashboard' })
  @ApiResponse({ status: 200, type: [CampaignPerformanceDto] })
  getCampaignPerformance(): Promise<CampaignPerformanceDto[]> {
    return this.analyticsService.getCampaignPerformance();
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top referrers leaderboard with revenue' })
  @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
  getLeaderboard(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardEntryDto[]> {
    return this.analyticsService.getLeaderboard(
      query.limit ?? 10,
      query.campaignId,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export referral performance report as CSV' })
  @ApiResponse({ status: 200, description: 'CSV report' })
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="referral-analytics.csv"',
  )
  exportReport(): Promise<string> {
    return this.analyticsService.exportReferralReportCsv();
  }
}
