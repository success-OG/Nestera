import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(ReferralCampaign)
    private campaignRepository: Repository<ReferralCampaign>,
  ) {}

  async createCampaign(dto: CreateCampaignDto): Promise<ReferralCampaign> {
    const campaign = this.campaignRepository.create({
      name: dto.name,
      description: dto.description || null,
      rewardAmount: dto.rewardAmount.toString(),
      refereeRewardAmount: dto.refereeRewardAmount?.toString() || null,
      minDepositAmount: dto.minDepositAmount?.toString() || '0',
      maxRewardsPerUser: dto.maxRewardsPerUser || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: true,
    });

    return this.campaignRepository.save(campaign);
  }

  async getAllCampaigns(): Promise<ReferralCampaign[]> {
    return this.campaignRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveCampaigns(): Promise<ReferralCampaign[]> {
    const now = new Date();
    return this.campaignRepository
      .createQueryBuilder('campaign')
      .where('campaign.isActive = :isActive', { isActive: true })
      .andWhere('(campaign.startDate IS NULL OR campaign.startDate <= :now)', {
        now,
      })
      .andWhere('(campaign.endDate IS NULL OR campaign.endDate >= :now)', {
        now,
      })
      .getMany();
  }

  async getCampaignById(id: string): Promise<ReferralCampaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async updateCampaign(
    id: string,
    dto: UpdateCampaignDto,
  ): Promise<ReferralCampaign> {
    const campaign = await this.getCampaignById(id);

    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.rewardAmount !== undefined)
      campaign.rewardAmount = dto.rewardAmount.toString();
    if (dto.refereeRewardAmount !== undefined)
      campaign.refereeRewardAmount =
        dto.refereeRewardAmount?.toString() || null;
    if (dto.minDepositAmount !== undefined)
      campaign.minDepositAmount = dto.minDepositAmount.toString();
    if (dto.maxRewardsPerUser !== undefined)
      campaign.maxRewardsPerUser = dto.maxRewardsPerUser;
    if (dto.isActive !== undefined) campaign.isActive = dto.isActive;
    if (dto.startDate !== undefined)
      campaign.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) campaign.endDate = new Date(dto.endDate);

    return this.campaignRepository.save(campaign);
  }

  async deleteCampaign(id: string): Promise<void> {
    const campaign = await this.getCampaignById(id);
    await this.campaignRepository.remove(campaign);
  }
}
