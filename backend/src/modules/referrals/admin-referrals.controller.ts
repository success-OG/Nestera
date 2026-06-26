import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { ReferralsService } from './referrals.service';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { UpdateReferralStatusDto } from './dto/referral.dto';
import { ReferralStatus } from './entities/referral.entity';

@ApiTags('admin/referrals')
@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  // Campaign Management
  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new referral campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all referral campaigns' })
  async getAllCampaigns() {
    return this.campaignsService.getAllCampaigns();
  }

  @Get('campaigns/active')
  @ApiOperation({ summary: 'Get active referral campaigns' })
  async getActiveCampaigns() {
    return this.campaignsService.getActiveCampaigns();
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a referral campaign' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete a referral campaign' })
  async deleteCampaign(@Param('id') id: string) {
    await this.campaignsService.deleteCampaign(id);
    return { message: 'Campaign deleted successfully' };
  }

  // Referral Management
  @Get('all')
  @ApiOperation({ summary: 'Get all referrals with optional filters' })
  async getAllReferrals(
    @Query('status') status?: ReferralStatus,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.referralsService.getAllReferrals(status, campaignId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update referral status' })
  async updateReferralStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusDto,
  ) {
    return this.referralsService.updateReferralStatus(
      id,
      dto.status,
      dto.rewardAmount,
    );
  }

  @Post(':id/distribute-rewards')
  @ApiOperation({
    summary: 'Manually trigger reward distribution for a referral',
  })
  async distributeRewards(@Param('id') id: string) {
    await this.referralsService.distributeRewards(id);
    return { message: 'Rewards distributed successfully' };
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get referral program analytics' })
  async getReferralAnalytics() {
    // This could be expanded with more detailed analytics
    const allReferrals = await this.referralsService.getAllReferrals();

    const analytics = {
      totalReferrals: allReferrals.length,
      pendingReferrals: allReferrals.filter(
        (r) => r.status === ReferralStatus.PENDING,
      ).length,
      completedReferrals: allReferrals.filter(
        (r) => r.status === ReferralStatus.COMPLETED,
      ).length,
      rewardedReferrals: allReferrals.filter(
        (r) => r.status === ReferralStatus.REWARDED,
      ).length,
      fraudulentReferrals: allReferrals.filter(
        (r) => r.status === ReferralStatus.FRAUDULENT,
      ).length,
      totalRewardsDistributed: allReferrals
        .filter((r) => r.status === ReferralStatus.REWARDED && r.rewardAmount)
        .reduce((sum, r) => sum + parseFloat(r.rewardAmount!), 0)
        .toFixed(7),
    };

    return analytics;
  }
}
