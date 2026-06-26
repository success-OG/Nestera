import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Scope analytics to a single campaign',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Scope leaderboard to a single campaign',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Number of top referrers to return',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ConversionFunnelDto {
  @ApiProperty({ description: 'Total referral codes generated' })
  codesGenerated!: number;

  @ApiProperty({ description: 'Referees who signed up using a code' })
  signups!: number;

  @ApiProperty({ description: 'Referrals that qualified (deposit completed)' })
  completed!: number;

  @ApiProperty({ description: 'Referrals that were rewarded' })
  rewarded!: number;

  @ApiProperty({ description: 'Referrals flagged as fraudulent' })
  fraudulent!: number;

  @ApiProperty({ description: 'Signup rate (signups / codesGenerated) as %' })
  signupRate!: number;

  @ApiProperty({
    description: 'Activation rate (completed / signups) as %',
  })
  activationRate!: number;

  @ApiProperty({ description: 'Reward rate (rewarded / completed) as %' })
  rewardRate!: number;

  @ApiProperty({
    description: 'Overall conversion (rewarded / codesGenerated) as %',
  })
  overallConversionRate!: number;
}

export class RevenueAttributionDto {
  @ApiProperty({ description: 'Distinct referred users who signed up' })
  referredUsers!: number;

  @ApiProperty({ description: 'Referred users who made a qualifying deposit' })
  payingReferredUsers!: number;

  @ApiProperty({
    description: 'Total deposit revenue attributed to referred users',
  })
  attributedRevenue!: string;

  @ApiProperty({ description: 'Total rewards paid out to referrers/referees' })
  rewardsPaid!: string;

  @ApiProperty({
    description: 'Net revenue (attributedRevenue - rewardsPaid)',
  })
  netRevenue!: string;

  @ApiProperty({
    description: 'Return on investment as % ((revenue - cost) / cost)',
    nullable: true,
  })
  roiPercentage!: number | null;

  @ApiProperty({ description: 'Average attributed revenue per signup' })
  averageRevenuePerReferral!: string;
}

export class CampaignPerformanceDto {
  @ApiProperty({ nullable: true })
  campaignId!: string | null;

  @ApiProperty()
  campaignName!: string;

  @ApiProperty({ type: () => ConversionFunnelDto })
  funnel!: ConversionFunnelDto;

  @ApiProperty({ type: () => RevenueAttributionDto })
  revenue!: RevenueAttributionDto;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  successfulReferrals!: number;

  @ApiProperty()
  attributedRevenue!: string;

  @ApiProperty()
  totalRewards!: string;
}

export class ReferralAnalyticsDashboardDto {
  @ApiProperty({ type: () => ConversionFunnelDto })
  funnel!: ConversionFunnelDto;

  @ApiProperty({ type: () => RevenueAttributionDto })
  revenue!: RevenueAttributionDto;

  @ApiProperty({ type: () => [CampaignPerformanceDto] })
  campaigns!: CampaignPerformanceDto[];

  @ApiProperty({ type: () => [LeaderboardEntryDto] })
  topReferrers!: LeaderboardEntryDto[];

  @ApiProperty()
  generatedAt!: Date;
}
