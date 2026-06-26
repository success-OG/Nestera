import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  SavingsGroup,
  SavingsGroupStatus,
} from './entities/savings-group.entity';
import {
  SavingsGroupMember,
  SavingsGroupRole,
} from './entities/savings-group-member.entity';
import {
  SavingsGroupActivity,
  SavingsGroupActivityType,
} from './entities/savings-group-activity.entity';
import { CreateSavingsGroupDto } from './dto/create-savings-group.dto';
import { ContributeSavingsGroupDto } from './dto/contribute-savings-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class GroupSavingsService {
  constructor(
    @InjectRepository(SavingsGroup)
    private readonly groupRepository: Repository<SavingsGroup>,
    @InjectRepository(SavingsGroupMember)
    private readonly memberRepository: Repository<SavingsGroupMember>,
    @InjectRepository(SavingsGroupActivity)
    private readonly activityRepository: Repository<SavingsGroupActivity>,
    private readonly dataSource: DataSource,
  ) {}

  async createGroup(
    creatorId: string,
    dto: CreateSavingsGroupDto,
  ): Promise<SavingsGroup> {
    return await this.dataSource.transaction(async (manager) => {
      const group = manager.create(SavingsGroup, {
        ...dto,
        creatorId,
        currentAmount: 0,
        status: SavingsGroupStatus.OPEN,
      });
      const savedGroup = await manager.save(group);

      const member = manager.create(SavingsGroupMember, {
        groupId: savedGroup.id,
        userId: creatorId,
        role: SavingsGroupRole.ADMIN,
        contributionAmount: 0,
      });
      await manager.save(member);

      const activity = manager.create(SavingsGroupActivity, {
        groupId: savedGroup.id,
        userId: creatorId,
        type: SavingsGroupActivityType.CREATED,
        metadata: { name: savedGroup.name },
      });
      await manager.save(activity);

      return savedGroup;
    });
  }

  async joinGroup(
    userId: string,
    groupId: string,
  ): Promise<SavingsGroupMember> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');
    if (group.status !== SavingsGroupStatus.OPEN) {
      throw new BadRequestException('Group is not open for joining');
    }

    const existingMember = await this.memberRepository.findOneBy({
      groupId,
      userId,
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this group');
    }

    return await this.dataSource.transaction(async (manager) => {
      const member = manager.create(SavingsGroupMember, {
        groupId,
        userId,
        role: SavingsGroupRole.MEMBER,
        contributionAmount: 0,
      });
      const savedMember = await manager.save(member);

      const activity = manager.create(SavingsGroupActivity, {
        groupId,
        userId,
        type: SavingsGroupActivityType.JOINED,
      });
      await manager.save(activity);

      return savedMember;
    });
  }

  async inviteMember(
    adminId: string,
    groupId: string,
    dto: InviteMemberDto,
  ): Promise<SavingsGroupMember> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');

    const adminMember = await this.memberRepository.findOneBy({
      groupId,
      userId: adminId,
    });
    if (!adminMember || adminMember.role !== SavingsGroupRole.ADMIN) {
      throw new ForbiddenException('Only group admins can invite members');
    }

    const targetUserId = dto.userId;
    const existingMember = await this.memberRepository.findOneBy({
      groupId,
      userId: targetUserId,
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this group');
    }

    return await this.dataSource.transaction(async (manager) => {
      const member = manager.create(SavingsGroupMember, {
        groupId,
        userId: targetUserId,
        role: SavingsGroupRole.MEMBER,
        contributionAmount: 0,
      });
      const savedMember = await manager.save(member);

      const activity = manager.create(SavingsGroupActivity, {
        groupId,
        userId: targetUserId,
        type: SavingsGroupActivityType.INVITED,
        metadata: { invitedBy: adminId },
      });
      await manager.save(activity);

      return savedMember;
    });
  }

  async listMembers(groupId: string): Promise<SavingsGroupMember[]> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');

    return await this.memberRepository.find({
      where: { groupId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async contribute(
    userId: string,
    groupId: string,
    dto: ContributeSavingsGroupDto,
  ): Promise<SavingsGroup> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');
    if (group.status !== SavingsGroupStatus.OPEN) {
      throw new BadRequestException('Group is not accepting contributions');
    }

    const member = await this.memberRepository.findOneBy({ groupId, userId });
    if (!member) {
      throw new ForbiddenException('Only group members can contribute');
    }

    return await this.dataSource.transaction(async (manager) => {
      const amount = Number(dto.amount);

      // Update member contribution
      member.contributionAmount = Number(member.contributionAmount) + amount;
      await manager.save(member);

      // Update group total
      group.currentAmount = Number(group.currentAmount) + amount;

      // Check if goal reached
      if (Number(group.currentAmount) >= Number(group.targetAmount)) {
        group.status = SavingsGroupStatus.COMPLETED;
      }

      const savedGroup = await manager.save(group);

      // Record activity
      const activity = manager.create(SavingsGroupActivity, {
        groupId,
        userId,
        type: SavingsGroupActivityType.CONTRIBUTED,
        amount,
      });
      await manager.save(activity);

      return savedGroup;
    });
  }

  async getActivity(groupId: string): Promise<SavingsGroupActivity[]> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');

    return await this.activityRepository.find({
      where: { groupId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async leaveGroup(
    userId: string,
    groupId: string,
  ): Promise<{ success: boolean; refundAmount: number }> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Savings group not found');

    const member = await this.memberRepository.findOneBy({ groupId, userId });
    if (!member) throw new NotFoundException('Membership not found');

    return await this.dataSource.transaction(async (manager) => {
      const refundAmount = Number(member.contributionAmount);

      // Update group amount
      group.currentAmount = Number(group.currentAmount) - refundAmount;
      if (
        group.status === SavingsGroupStatus.COMPLETED &&
        Number(group.currentAmount) < Number(group.targetAmount)
      ) {
        group.status = SavingsGroupStatus.OPEN;
      }
      await manager.save(group);

      // Record refund activity
      if (refundAmount > 0) {
        const refundActivity = manager.create(SavingsGroupActivity, {
          groupId,
          userId,
          type: SavingsGroupActivityType.REFUNDED,
          amount: refundAmount,
        });
        await manager.save(refundActivity);
      }

      // Record leave activity
      const leaveActivity = manager.create(SavingsGroupActivity, {
        groupId,
        userId,
        type: SavingsGroupActivityType.LEFT,
      });
      await manager.save(leaveActivity);

      // Remove member
      await manager.remove(member);

      return { success: true, refundAmount };
    });
  }
}
