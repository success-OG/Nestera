import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BadgesService } from './badges.service';
import { BadgeDto, UserBadgeDto, BadgeStatsDto } from './dto/badge.dto';

@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * GET /badges
   * Get all available badges with earning status
   */
  @Get()
  async getAvailableBadges(@Request() req): Promise<BadgeDto[]> {
    return this.badgesService.getAvailableBadges(req.user.userId);
  }

  /**
   * GET /badges/my
   * Get current user's earned badges
   */
  @Get('my')
  async getUserBadges(@Request() req): Promise<UserBadgeDto[]> {
    return this.badgesService.getUserBadges(req.user.userId);
  }

  /**
   * GET /badges/stats
   * Get badge statistics for current user
   */
  @Get('stats')
  async getBadgeStats(@Request() req): Promise<BadgeStatsDto> {
    return this.badgesService.getBadgeStats(req.user.userId);
  }

  /**
   * POST /badges/:id/share
   * Generate share token for a badge
   */
  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  async generateShareToken(
    @Param('id') userBadgeId: string,
    @Request() req,
  ): Promise<{ shareToken: string; shareUrl: string }> {
    const shareToken = await this.badgesService.generateShareToken(
      req.user.userId,
      userBadgeId,
    );
    return {
      shareToken,
      shareUrl: `/badges/shared/${shareToken}`,
    };
  }

  /**
   * GET /badges/shared/:token
   * Get shared badge by token (public endpoint)
   */
  @Get('shared/:token')
  async getSharedBadge(@Param('token') token: string): Promise<UserBadgeDto> {
    return this.badgesService.getSharedBadge(token);
  }
}
