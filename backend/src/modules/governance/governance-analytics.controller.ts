import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GovernanceAnalyticsService } from './governance-analytics.service';
import { ParticipationStatsDto } from './dto/participation-stats.dto';
import { ProposalAnalyticsDto } from './dto/proposal-analytics.dto';
import { TemplateUsageDto } from './dto/template-usage.dto';
import { TopVoterDto } from './dto/top-voter.dto';
import { GovernanceTrendDto } from './dto/governance-trend.dto';

@ApiTags('governance-analytics')
@Controller('governance/analytics')
export class GovernanceAnalyticsController {
  constructor(private readonly analyticsService: GovernanceAnalyticsService) {}

  @Get('participation')
  @ApiOperation({ summary: 'Get voter turnout and participation stats' })
  @ApiResponse({ status: 200, type: ParticipationStatsDto })
  async getParticipationStats(): Promise<ParticipationStatsDto> {
    return this.analyticsService.getParticipationStats();
  }

  @Get('proposals')
  @ApiOperation({
    summary: 'Get proposal success rates and category breakdown',
  })
  @ApiResponse({ status: 200, type: ProposalAnalyticsDto })
  async getProposalAnalytics(): Promise<ProposalAnalyticsDto> {
    return this.analyticsService.getProposalAnalytics();
  }

  @Get('top-voters')
  @ApiOperation({ summary: 'Get the most active governance participants' })
  @ApiResponse({ status: 200, type: [TopVoterDto] })
  async getTopVoters(): Promise<TopVoterDto[]> {
    return this.analyticsService.getTopVoters();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get governance trends over time' })
  @ApiResponse({ status: 200, type: GovernanceTrendDto })
  async getTrends(): Promise<GovernanceTrendDto> {
    return this.analyticsService.getTrends();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get governance template usage analytics' })
  @ApiResponse({ status: 200, type: [TemplateUsageDto] })
  async getTemplateUsage(): Promise<TemplateUsageDto[]> {
    return this.analyticsService.getTemplateUsage();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export governance data for research (JSON)' })
  @ApiResponse({
    status: 200,
    description: 'JSON download of governance historical data',
  })
  async exportData(@Res() res: Response): Promise<void> {
    const data = await this.analyticsService.exportData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=governance-export.json',
    );
    res.send(JSON.stringify(data, null, 2));
  }
}
