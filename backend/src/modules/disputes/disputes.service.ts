import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispute,
  DisputeMessage,
  DisputeStatus,
  DisputeTimeline,
} from './entities/dispute.entity';
import { MedicalClaim } from '../claims/entities/medical-claim.entity';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  AddDisputeMessageDto,
} from './dto/dispute.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeMessage)
    private readonly messageRepository: Repository<DisputeMessage>,
    @InjectRepository(MedicalClaim)
    private readonly claimRepository: Repository<MedicalClaim>,
    @InjectRepository(DisputeTimeline)
    private readonly timelineRepository: Repository<DisputeTimeline>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createDispute(createDisputeDto: CreateDisputeDto): Promise<Dispute> {
    const claim = await this.claimRepository.findOneBy({
      id: createDisputeDto.claimId,
    });
    if (!claim) {
      throw new BadRequestException('Invalid claim ID. Claim does not exist.');
    }

    const dispute = this.disputeRepository.create({
      ...createDisputeDto,
      status: DisputeStatus.OPEN,
    });
    const savedDispute = await this.disputeRepository.save(dispute);

    // Add timeline entry
    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: savedDispute.id,
        action: 'CREATED',
        performedBy: savedDispute.disputedBy,
        description: 'Dispute created',
      }),
    );

    // Notify (in a real app, we'd notify the claim owner or admins)
    // For now, let's just assume there's a way to find them.
    // For demo, we'll skip actual notification to a specific user since we don't have user ID of claim owner here easily without more queries.
    // But we can log it.

    return savedDispute;
  }

  async findAll(): Promise<Dispute[]> {
    return await this.disputeRepository.find({
      relations: ['claim', 'messages', 'timeline'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['claim', 'messages', 'timeline'],
    });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    return dispute;
  }

  async updateDispute(
    id: string,
    updateDisputeDto: UpdateDisputeDto,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    Object.assign(dispute, updateDisputeDto);
    return await this.disputeRepository.save(dispute);
  }

  async addMessage(
    id: string,
    addMessageDto: AddDisputeMessageDto,
  ): Promise<DisputeMessage> {
    const dispute = await this.findOne(id);

    const message = this.messageRepository.create({
      disputeId: dispute.id,
      ...addMessageDto,
    });
    const savedMessage = await this.messageRepository.save(message);

    // Add timeline entry
    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: dispute.id,
        action: 'MESSAGE_ADDED',
        performedBy: addMessageDto.author,
        description: addMessageDto.message,
      }),
    );

    return savedMessage;
  }

  async startInvestigation(id: string, actor: string): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = { status: dispute.status };

    dispute.status = DisputeStatus.UNDER_REVIEW;
    dispute.assignedTo = actor;
    dispute.assignedAt = new Date();

    const updatedDispute = await this.disputeRepository.save(dispute);

    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: id,
        action: 'INVESTIGATION_STARTED',
        performedBy: actor,
        description: 'Investigation started',
        previousState,
        newState: { status: dispute.status },
      }),
    );

    return updatedDispute;
  }

  async resolveDispute(
    id: string,
    actor: string,
    resolution: string,
  ): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = { status: dispute.status };

    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = actor;
    dispute.resolution = resolution;

    const updatedDispute = await this.disputeRepository.save(dispute);

    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: id,
        action: 'DISPUTE_RESOLVED',
        performedBy: actor,
        description: `Resolved: ${resolution}`,
        previousState,
        newState: { status: dispute.status },
      }),
    );

    return updatedDispute;
  }

  async closeDispute(id: string, actor: string): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = { status: dispute.status };

    dispute.status = DisputeStatus.CLOSED;

    const updatedDispute = await this.disputeRepository.save(dispute);

    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: id,
        action: 'DISPUTE_CLOSED',
        performedBy: actor,
        description: 'Dispute closed',
        previousState,
        newState: { status: dispute.status },
      }),
    );

    return updatedDispute;
  }

  async escalateDispute(id: string, actor: string): Promise<Dispute> {
    const dispute = await this.findOne(id);
    const previousState = { status: dispute.status };

    dispute.status = DisputeStatus.ESCALATED;
    dispute.escalatedTo = actor;
    dispute.escalatedAt = new Date();

    const updatedDispute = await this.disputeRepository.save(dispute);

    await this.timelineRepository.save(
      this.timelineRepository.create({
        disputeId: id,
        action: 'DISPUTE_ESCALATED',
        performedBy: actor,
        description: 'Dispute escalated',
        previousState,
        newState: { status: dispute.status },
      }),
    );

    return updatedDispute;
  }
}
