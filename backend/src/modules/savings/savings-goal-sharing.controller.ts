import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateShareLinkDto,
  PublicGoalDirectoryQueryDto,
  SocialShareDto,
  UpdateGoalSharingDto,
} from './dto/goal-sharing.dto';
import { SavingsGoalSharingService } from './savings-goal-sharing.service';

@ApiTags('savings-goal-sharing')
@Controller('savings')
export class SavingsGoalSharingController {
  constructor(private readonly sharingService: SavingsGoalSharingService) {}

  @Patch('goals/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update sharing permissions for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async updateSharing(
    @Param('id') id: string,
    @Body() dto: UpdateGoalSharingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.upsertSharing(id, user.id, dto);
  }

  @Get('goals/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sharing permissions for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getSharing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.getSharing(id, user.id);
  }

  @Post('goals/:id/share/link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shareable link for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async createShareLink(
    @Param('id') id: string,
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.createShareLink(id, user.id, dto.expiresAt);
  }

  @Delete('goals/:id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke sharing for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async revokeSharing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.revokeShare(id, user.id);
  }

  @Get('share/:token')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Resolve a public or friend-permitted share link' })
  @ApiParam({ name: 'token', type: 'string' })
  async getSharedGoal(
    @Param('token') token: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.sharingService.getSharedGoalByToken(token, user?.id);
  }

  @Get('public-goals')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List publicly shared savings goals' })
  @ApiResponse({ status: 200, description: 'Public savings goal directory' })
  async getPublicGoals(
    @Query() query: PublicGoalDirectoryQueryDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.sharingService.getDirectory(query.page, query.limit, user?.id);
  }

  @Get('goals/:id/share/progress')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a shared goal progress update' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getProgressUpdate(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string },
  ) {
    return this.sharingService.getProgressUpdate(id, user?.id);
  }

  @Post('goals/:id/share/social')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a social share intent for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async createSocialShare(
    @Param('id') id: string,
    @Body() dto: SocialShareDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.createSocialShare(id, user.id, dto);
  }

  @Get('goals/:id/share/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sharing analytics for a goal' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.sharingService.getAnalytics(id, user.id);
  }
}
