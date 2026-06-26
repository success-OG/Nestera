import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { SavingsGoal } from './entities/savings-goal.entity';
import {
  SavingsGoalShare,
  SavingsGoalShareVisibility,
} from './entities/savings-goal-share.entity';
import {
  SavingsGoalShareEvent,
  SavingsGoalShareEventType,
} from './entities/savings-goal-share-event.entity';
import { SavingsService, SavingsGoalProgress } from './savings.service';
import { SocialShareDto, UpdateGoalSharingDto } from './dto/goal-sharing.dto';

export interface SharedGoalResponse {
  goal: {
    id: string;
    goalName: string;
    targetDate: Date;
    status: SavingsGoal['status'];
    metadata: SavingsGoal['metadata'];
    targetAmount?: number;
    currentBalance?: number;
    percentageComplete?: number;
    projectedBalance?: number;
    isOffTrack?: boolean;
    projectionGap?: number;
  };
  owner: {
    id: string;
    name?: string | null;
  };
  share: SavingsGoalShare;
}

@Injectable()
export class SavingsGoalSharingService {
  constructor(
    @InjectRepository(SavingsGoal)
    private readonly goalRepository: Repository<SavingsGoal>,
    @InjectRepository(SavingsGoalShare)
    private readonly shareRepository: Repository<SavingsGoalShare>,
    @InjectRepository(SavingsGoalShareEvent)
    private readonly eventRepository: Repository<SavingsGoalShareEvent>,
    private readonly savingsService: SavingsService,
    private readonly configService: ConfigService,
  ) {}

  async upsertSharing(
    goalId: string,
    ownerId: string,
    dto: UpdateGoalSharingDto,
  ): Promise<SavingsGoalShare> {
    await this.assertGoalOwner(goalId, ownerId);

    if (
      dto.visibility !== SavingsGoalShareVisibility.PUBLIC &&
      dto.isDirectoryListed
    ) {
      throw new BadRequestException(
        'Only public goals can be listed in the public directory',
      );
    }

    let share = await this.shareRepository.findOne({ where: { goalId } });
    if (!share) {
      share = this.shareRepository.create({ goalId, ownerId });
    }

    Object.assign(share, {
      visibility: dto.visibility,
      isDirectoryListed:
        dto.isDirectoryListed ?? share.isDirectoryListed ?? false,
      showProgress: dto.showProgress ?? share.showProgress ?? true,
      showTargetAmount: dto.showTargetAmount ?? share.showTargetAmount ?? false,
      showOwnerName: dto.showOwnerName ?? share.showOwnerName ?? true,
      allowSocialSharing:
        dto.allowSocialSharing ?? share.allowSocialSharing ?? true,
      allowProgressUpdates:
        dto.allowProgressUpdates ?? share.allowProgressUpdates ?? true,
      allowedUserIds: dto.allowedUserIds ?? share.allowedUserIds ?? null,
      revokedAt:
        dto.visibility === SavingsGoalShareVisibility.PRIVATE
          ? (share.revokedAt ?? new Date())
          : null,
    });

    const saved = await this.shareRepository.save(share);
    await this.recordEvent(saved, SavingsGoalShareEventType.PERMISSION_UPDATED);
    return saved;
  }

  async getSharing(goalId: string, ownerId: string): Promise<SavingsGoalShare> {
    await this.assertGoalOwner(goalId, ownerId);
    const share = await this.shareRepository.findOne({ where: { goalId } });
    if (!share) {
      throw new NotFoundException('Sharing settings have not been created');
    }
    return share;
  }

  async createShareLink(
    goalId: string,
    ownerId: string,
    expiresAt?: string,
  ): Promise<{ share: SavingsGoalShare; shareUrl: string }> {
    await this.assertGoalOwner(goalId, ownerId);

    let share = await this.shareRepository.findOne({ where: { goalId } });
    if (!share) {
      share = this.shareRepository.create({
        goalId,
        ownerId,
        visibility: SavingsGoalShareVisibility.UNLISTED,
      });
    }

    if (share.visibility === SavingsGoalShareVisibility.PRIVATE) {
      share.visibility = SavingsGoalShareVisibility.UNLISTED;
    }

    share.shareToken = await this.generateUniqueToken();
    share.expiresAt = expiresAt ? new Date(expiresAt) : null;
    share.revokedAt = null;

    const saved = await this.shareRepository.save(share);
    await this.recordEvent(saved, SavingsGoalShareEventType.LINK_CREATED);
    return { share: saved, shareUrl: this.buildShareUrl(saved.shareToken) };
  }

  async revokeShare(
    goalId: string,
    ownerId: string,
  ): Promise<SavingsGoalShare> {
    await this.assertGoalOwner(goalId, ownerId);
    const share = await this.shareRepository.findOne({ where: { goalId } });
    if (!share) {
      throw new NotFoundException('Sharing settings have not been created');
    }

    share.revokedAt = new Date();
    share.visibility = SavingsGoalShareVisibility.PRIVATE;
    share.isDirectoryListed = false;
    const saved = await this.shareRepository.save(share);
    await this.recordEvent(saved, SavingsGoalShareEventType.REVOKED);
    return saved;
  }

  async getSharedGoalByToken(
    token: string,
    viewerId?: string,
  ): Promise<SharedGoalResponse> {
    const share = await this.shareRepository.findOne({
      where: { shareToken: token },
      relations: ['goal', 'owner'],
    });
    if (!share) {
      throw new NotFoundException('Shared goal not found');
    }

    this.assertShareActive(share);
    this.assertViewerCanAccess(share, viewerId);

    await this.recordEvent(share, SavingsGoalShareEventType.VIEW, viewerId);
    return this.mapSharedGoal(share);
  }

  async getDirectory(
    page = 1,
    limit = 20,
    viewerId?: string,
  ): Promise<{
    data: SharedGoalResponse[];
    page: number;
    limit: number;
    total: number;
  }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

    const [shares, total] = await this.shareRepository.findAndCount({
      where: [
        {
          visibility: SavingsGoalShareVisibility.PUBLIC,
          isDirectoryListed: true,
          revokedAt: IsNull(),
          expiresAt: IsNull(),
        },
        {
          visibility: SavingsGoalShareVisibility.PUBLIC,
          isDirectoryListed: true,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      ],
      relations: ['goal', 'owner'],
      order: { updatedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    for (const share of shares) {
      await this.recordEvent(
        share,
        SavingsGoalShareEventType.DIRECTORY_VIEW,
        viewerId,
      );
    }

    return {
      data: await Promise.all(shares.map((share) => this.mapSharedGoal(share))),
      page: safePage,
      limit: safeLimit,
      total,
    };
  }

  async getProgressUpdate(
    goalId: string,
    viewerId?: string,
  ): Promise<SharedGoalResponse> {
    const share = await this.shareRepository.findOne({
      where: { goalId },
      relations: ['goal', 'owner'],
    });
    if (!share) {
      throw new NotFoundException('Shared goal not found');
    }

    this.assertShareActive(share);
    this.assertViewerCanAccess(share, viewerId);
    if (!share.allowProgressUpdates || !share.showProgress) {
      throw new ForbiddenException(
        'Progress updates are private for this goal',
      );
    }

    await this.recordEvent(
      share,
      SavingsGoalShareEventType.PROGRESS_UPDATE,
      viewerId,
    );
    return this.mapSharedGoal(share);
  }

  async createSocialShare(
    goalId: string,
    ownerId: string,
    dto: SocialShareDto,
  ): Promise<{
    platform: string;
    shareUrl: string;
    intentUrl: string;
    message: string;
  }> {
    const share = await this.getSharing(goalId, ownerId);
    this.assertShareActive(share);
    if (!share.allowSocialSharing) {
      throw new ForbiddenException('Social sharing is disabled for this goal');
    }
    if (!share.shareToken) {
      share.shareToken = await this.generateUniqueToken();
      await this.shareRepository.save(share);
    }

    const shareUrl = this.buildShareUrl(share.shareToken);
    const message =
      dto.message ?? `Follow my Nestera savings goal progress: ${shareUrl}`;
    await this.recordEvent(
      share,
      SavingsGoalShareEventType.SOCIAL_SHARE,
      ownerId,
      {
        platform: dto.platform,
        message,
      },
    );

    return {
      platform: dto.platform,
      shareUrl,
      intentUrl: this.buildSocialIntentUrl(dto.platform, shareUrl, message),
      message,
    };
  }

  async getAnalytics(
    goalId: string,
    ownerId: string,
  ): Promise<{
    goalId: string;
    totalViews: number;
    directoryViews: number;
    socialShares: number;
    progressUpdates: number;
    uniqueViewers: number;
    byPlatform: Record<string, number>;
  }> {
    const share = await this.getSharing(goalId, ownerId);
    const events = await this.eventRepository.find({
      where: { shareId: share.id },
    });

    const byPlatform: Record<string, number> = {};
    for (const event of events) {
      if (event.platform) {
        byPlatform[event.platform] = (byPlatform[event.platform] ?? 0) + 1;
      }
    }

    return {
      goalId,
      totalViews: events.filter(
        (event) => event.eventType === SavingsGoalShareEventType.VIEW,
      ).length,
      directoryViews: events.filter(
        (event) => event.eventType === SavingsGoalShareEventType.DIRECTORY_VIEW,
      ).length,
      socialShares: events.filter(
        (event) => event.eventType === SavingsGoalShareEventType.SOCIAL_SHARE,
      ).length,
      progressUpdates: events.filter(
        (event) =>
          event.eventType === SavingsGoalShareEventType.PROGRESS_UPDATE,
      ).length,
      uniqueViewers: new Set(
        events.map((event) => event.viewerId).filter(Boolean),
      ).size,
      byPlatform,
    };
  }

  private async assertGoalOwner(
    goalId: string,
    ownerId: string,
  ): Promise<SavingsGoal> {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, userId: ownerId },
    });
    if (!goal) {
      throw new NotFoundException(
        `Savings goal ${goalId} not found or does not belong to user`,
      );
    }
    return goal;
  }

  private assertShareActive(share: SavingsGoalShare): void {
    if (share.revokedAt) {
      throw new ForbiddenException('This share has been revoked');
    }
    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('This share link has expired');
    }
    if (share.visibility === SavingsGoalShareVisibility.PRIVATE) {
      throw new ForbiddenException('This goal is private');
    }
  }

  private assertViewerCanAccess(
    share: SavingsGoalShare,
    viewerId?: string,
  ): void {
    if (
      share.visibility === SavingsGoalShareVisibility.PUBLIC ||
      share.visibility === SavingsGoalShareVisibility.UNLISTED
    ) {
      return;
    }
    if (share.ownerId === viewerId) {
      return;
    }
    if (
      share.visibility === SavingsGoalShareVisibility.FRIENDS &&
      viewerId &&
      (share.allowedUserIds ?? []).includes(viewerId)
    ) {
      return;
    }
    throw new ForbiddenException(
      'You do not have permission to view this goal',
    );
  }

  private async mapSharedGoal(
    share: SavingsGoalShare,
  ): Promise<SharedGoalResponse> {
    const progress = await this.findGoalProgress(share.goal);
    return {
      goal: {
        id: share.goal.id,
        goalName: share.goal.goalName,
        targetDate: share.goal.targetDate,
        status: share.goal.status,
        metadata: share.goal.metadata,
        ...(share.showTargetAmount
          ? { targetAmount: Number(share.goal.targetAmount) }
          : {}),
        ...(share.showProgress && progress
          ? {
              currentBalance: progress.currentBalance,
              percentageComplete: progress.percentageComplete,
              projectedBalance: progress.projectedBalance,
              isOffTrack: progress.isOffTrack,
              projectionGap: progress.projectionGap,
            }
          : {}),
      },
      owner: {
        id: share.ownerId,
        name: share.showOwnerName ? share.owner?.name : null,
      },
      share,
    };
  }

  private async findGoalProgress(
    goal: SavingsGoal,
  ): Promise<SavingsGoalProgress | undefined> {
    const goals = await this.savingsService.findMyGoals(goal.userId);
    return goals.find((item) => item.id === goal.id);
  }

  private async recordEvent(
    share: SavingsGoalShare,
    eventType: SavingsGoalShareEventType,
    viewerId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventRepository.save(
      this.eventRepository.create({
        shareId: share.id,
        goalId: share.goalId,
        viewerId: viewerId ?? null,
        eventType,
        platform:
          typeof metadata?.platform === 'string' ? metadata.platform : null,
        metadata: metadata ?? null,
      }),
    );
  }

  private async generateUniqueToken(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(24).toString('base64url');
      const existing = await this.shareRepository.findOne({
        where: { shareToken: token },
      });
      if (!existing) {
        return token;
      }
    }
    throw new BadRequestException('Unable to generate a share token');
  }

  private buildShareUrl(token: string | null): string {
    const baseUrl =
      this.configService.get<string>('PUBLIC_APP_URL') ??
      this.configService.get<string>('APP_URL') ??
      'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/goals/shared/${token}`;
  }

  private buildSocialIntentUrl(
    platform: SocialShareDto['platform'],
    shareUrl: string,
    message: string,
  ): string {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedMessage = encodeURIComponent(message);
    switch (platform) {
      case 'x':
        return `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`;
      case 'copy':
      default:
        return shareUrl;
    }
  }
}
