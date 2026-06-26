import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  DisputeStatus,
  DisputePriority,
  DisputeTimeline,
} from '../disputes/entities/dispute.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DisputeFilterDto,
  AssignDisputeDto,
  ResolveDisputeDto,
  EscalateDisputeDto,
  AddEvidenceDto,
  UpdateDisputeDto,
} from './dto/admin-dispute.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AdminDisputesService {
  private readonly logger = new Logger(AdminDisputesService.name);

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeTimeline)
    private readonly timelineRepository: Repository<DisputeTimeline>,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find all disputes with optional filters
   */
  async findAll(
    filters: DisputeFilterDto,
  ): Promise<{ disputes: Dispute[]; total: number }> {
    const query = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.claim', 'claim')
      .leftJoinAndSelect('dispute.messages', 'messages')
      .leftJoinAndSelect('dispute.timeline', 'timeline');

    if (filters.status) {
      query.andWhere('dispute.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('dispute.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.assignedTo) {
      query.andWhere('dispute.assignedTo = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters.fromDate) {
      query.andWhere('dispute.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      query.andWhere('dispute.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }

    query.orderBy('dispute.createdAt', 'DESC');

    const [disputes, total] = await query.getManyAndCount();
    return { disputes, total };
  }

  /**
   * Find a single dispute by ID
   */
  async findOne(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['claim', 'messages', 'timeline', 'timeline.dispute'],
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute with ID ${id} not found`);
    }

    return dispute;
  }

  /**
   * Get the timeline/history for a dispute
   */
  async getTimeline(id: string): Promise<DisputeTimeline[]> {
    const dispute = await this.findOne(id);
    return dispute.timeline || [];
  }

  /**
   * Assign a dispute to an admin
   */
  async assignDispute(
    id: string,
    dto: AssignDisputeDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = {
      assignedTo: dispute.assignedTo,
      assignedAt: dispute.assignedAt,
    };

    dispute.assignedTo = dto.assignedTo;
    dispute.assignedAt = new Date();
    dispute.status =
      dispute.status === DisputeStatus.OPEN
        ? DisputeStatus.IN_PROGRESS
        : dispute.status;

    const savedDispute = await this.disputeRepository.save(dispute);

    // Create timeline entry
    await this.createTimelineEntry(
      dispute,
      'ASSIGN',
      adminId,
      'Dispute assigned to admin',
      previousState,
      {
        assignedTo: dto.assignedTo,
        assignedAt: dispute.assignedAt,
      },
      ipAddress,
    );

    // Notify user
    await this.notifyUserOnStatusChange(dispute, 'assigned');

    // Emit event
    this.eventEmitter.emit('dispute.assigned', {
      disputeId: id,
      assignedTo: dto.assignedTo,
    });

    return savedDispute;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    id: string,
    dto: ResolveDisputeDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = {
      status: dispute.status,
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt,
      resolvedBy: dispute.resolvedBy,
    };

    dispute.resolution = dto.resolution;
    dispute.status = dto.status || DisputeStatus.RESOLVED;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = adminId;

    const savedDispute = await this.disputeRepository.save(dispute);

    // Create timeline entry
    await this.createTimelineEntry(
      dispute,
      'RESOLVE',
      adminId,
      'Dispute resolved',
      previousState,
      {
        resolution: dto.resolution,
        status: dispute.status,
        resolvedAt: dispute.resolvedAt,
        resolvedBy: adminId,
      },
      ipAddress,
    );

    // Notify user
    await this.notifyUserOnStatusChange(dispute, 'resolved');

    // Emit event
    this.eventEmitter.emit('dispute.resolved', {
      disputeId: id,
      resolution: dto.resolution,
    });

    return savedDispute;
  }

  /**
   * Escalate a dispute to a senior admin
   */
  async escalateDispute(
    id: string,
    dto: EscalateDisputeDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = {
      escalatedTo: dispute.escalatedTo,
      escalatedAt: dispute.escalatedAt,
      status: dispute.status,
    };

    dispute.escalatedTo = dto.escalatedTo;
    dispute.escalatedAt = new Date();
    dispute.status = DisputeStatus.ESCALATED;

    const savedDispute = await this.disputeRepository.save(dispute);

    // Create timeline entry
    await this.createTimelineEntry(
      dispute,
      'ESCALATE',
      adminId,
      dto.reason
        ? `Dispute escalated: ${dto.reason}`
        : 'Dispute escalated to senior admin',
      previousState,
      {
        escalatedTo: dto.escalatedTo,
        escalatedAt: dispute.escalatedAt,
        status: DisputeStatus.ESCALATED,
      },
      ipAddress,
    );

    // Notify user
    await this.notifyUserOnStatusChange(dispute, 'escalated');

    // Emit event
    this.eventEmitter.emit('dispute.escalated', {
      disputeId: id,
      escalatedTo: dto.escalatedTo,
    });

    return savedDispute;
  }

  /**
   * Add evidence/document to a dispute
   */
  async addEvidence(
    id: string,
    dto: AddEvidenceDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = { evidence: dispute.evidence || [] };

    const newEvidence = {
      id: crypto.randomUUID(),
      name: dto.name,
      url: dto.url,
      type: dto.type || 'document',
      description: dto.description,
      uploadedAt: new Date(),
      uploadedBy: adminId,
    };

    dispute.evidence = [...(dispute.evidence || []), newEvidence];

    const savedDispute = await this.disputeRepository.save(dispute);

    // Create timeline entry
    await this.createTimelineEntry(
      dispute,
      'EVIDENCE_ADD',
      adminId,
      `Evidence added: ${dto.name}`,
      previousState,
      {
        evidence: dispute.evidence,
      },
      ipAddress,
    );

    // Emit event
    this.eventEmitter.emit('dispute.evidence.added', {
      disputeId: id,
      evidence: newEvidence,
    });

    return savedDispute;
  }

  /**
   * Update dispute status/priority
   */
  async updateDispute(
    id: string,
    dto: UpdateDisputeDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = {
      status: dispute.status,
      priority: dispute.priority,
      assignedTo: dispute.assignedTo,
    };

    if (dto.status) {
      dispute.status = dto.status;
    }
    if (dto.priority) {
      dispute.priority = dto.priority;
    }
    if (dto.assignedTo) {
      dispute.assignedTo = dto.assignedTo;
      dispute.assignedAt = new Date();
    }

    const savedDispute = await this.disputeRepository.save(dispute);

    // Create timeline entry
    await this.createTimelineEntry(
      dispute,
      'UPDATE',
      adminId,
      'Dispute updated',
      previousState,
      {
        status: dispute.status,
        priority: dispute.priority,
        assignedTo: dispute.assignedTo,
      },
      ipAddress,
    );

    // Notify user if status changed
    if (dto.status && dto.status !== previousState.status) {
      await this.notifyUserOnStatusChange(dispute, 'updated');
    }

    // Emit event
    this.eventEmitter.emit('dispute.updated', { disputeId: id, changes: dto });

    return savedDispute;
  }

  /**
   * Get dispute statistics
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    escalated: number;
    byPriority: Record<string, number>;
  }> {
    const [
      total,
      open,
      inProgress,
      resolved,
      escalated,
      low,
      medium,
      high,
      critical,
    ] = await Promise.all([
      this.disputeRepository.count(),
      this.disputeRepository.count({ where: { status: DisputeStatus.OPEN } }),
      this.disputeRepository.count({
        where: { status: DisputeStatus.IN_PROGRESS },
      }),
      this.disputeRepository.count({
        where: { status: DisputeStatus.RESOLVED },
      }),
      this.disputeRepository.count({
        where: { status: DisputeStatus.ESCALATED },
      }),
      this.disputeRepository.count({
        where: { priority: DisputePriority.LOW },
      }),
      this.disputeRepository.count({
        where: { priority: DisputePriority.MEDIUM },
      }),
      this.disputeRepository.count({
        where: { priority: DisputePriority.HIGH },
      }),
      this.disputeRepository.count({
        where: { priority: DisputePriority.CRITICAL },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      escalated,
      byPriority: {
        low,
        medium,
        high,
        critical,
      },
    };
  }

  /**
   * Create a timeline entry for audit purposes
   */
  private async createTimelineEntry(
    dispute: Dispute,
    action: string,
    performedBy: string,
    description: string,
    previousState: Record<string, any>,
    newState: Record<string, any>,
    ipAddress?: string,
  ): Promise<DisputeTimeline> {
    const timelineEntry = this.timelineRepository.create({
      disputeId: dispute.id,
      action,
      performedBy,
      description,
      previousState,
      newState,
      ipAddress,
    });

    return await this.timelineRepository.save(timelineEntry);
  }

  /**
   * Notify user on status change
   */
  private async notifyUserOnStatusChange(
    dispute: Dispute,
    changeType: string,
  ): Promise<void> {
    try {
      let title = 'Dispute Update';
      let message = '';

      switch (changeType) {
        case 'assigned':
          title = 'Dispute Assigned';
          message = `Your dispute has been assigned to our team for review.`;
          break;
        case 'resolved':
          title = 'Dispute Resolved';
          message = `Your dispute has been resolved. Resolution: ${dispute.resolution}`;
          break;
        case 'escalated':
          title = 'Dispute Escalated';
          message = `Your dispute has been escalated to a senior administrator.`;
          break;
        case 'updated':
          title = 'Dispute Status Updated';
          message = `Your dispute status has been updated to: ${dispute.status}`;
          break;
      }

      await this.notificationsService.createNotification({
        userId: dispute.disputedBy,
        type: 'DISPUTE_UPDATE' as any,
        title,
        message,
        metadata: { disputeId: dispute.id, changeType },
      });
    } catch (error) {
      this.logger.error(
        `Failed to notify user on status change: ${error.message}`,
      );
    }
  }
}
