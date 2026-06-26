import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { CreateFlagDto } from './dto/create-flag.dto';
import { UpdateFlagDto } from './dto/update-flag.dto';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepository: Repository<FeatureFlag>,
  ) {}

  async findAll(): Promise<FeatureFlag[]> {
    return this.flagRepository.find({ order: { key: 'ASC' } });
  }

  async findOne(key: string): Promise<FeatureFlag> {
    const flag = await this.flagRepository.findOne({ where: { key } });
    if (!flag) throw new NotFoundException(`Feature flag "${key}" not found`);
    return flag;
  }

  async create(dto: CreateFlagDto): Promise<FeatureFlag> {
    const existing = await this.flagRepository.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Feature flag "${dto.key}" already exists`);
    }

    const flag = this.flagRepository.create({
      ...dto,
      enabled: dto.enabled ?? false,
      forceDisabled: dto.forceDisabled ?? false,
    });
    const saved = await this.flagRepository.save(flag);
    this.logger.log(`Feature flag created: ${saved.key}`);
    return saved;
  }

  async update(key: string, dto: UpdateFlagDto): Promise<FeatureFlag> {
    const flag = await this.findOne(key);
    Object.assign(flag, dto);
    const saved = await this.flagRepository.save(flag);
    this.logger.log(`Feature flag updated: ${key}`, { changes: Object.keys(dto) });
    return saved;
  }

  async toggle(key: string): Promise<FeatureFlag> {
    const flag = await this.findOne(key);
    flag.enabled = !flag.enabled;
    flag.forceDisabled = false;
    const saved = await this.flagRepository.save(flag);
    this.logger.log(`Feature flag toggled: ${key} → ${saved.enabled}`);
    return saved;
  }

  async remove(key: string): Promise<void> {
    const flag = await this.findOne(key);
    await this.flagRepository.remove(flag);
    this.logger.log(`Feature flag deleted: ${key}`);
  }

  /**
   * Evaluate a flag for a given user context.
   * Useful for server-side rendering and API-based evaluation.
   */
  async evaluate(
    key: string,
    context: { address?: string; network?: string; segments?: string[] },
  ): Promise<{ value: boolean | string | number; reason: string }> {
    const flag = await this.findOne(key);

    if (flag.forceDisabled) {
      return { value: false, reason: 'force_disabled' };
    }

    // User targeting
    if (flag.targetUsers?.length && context.address) {
      const truncated = context.address.slice(0, 10).toLowerCase();
      const isTargeted = flag.targetUsers.some((addr) =>
        addr.toLowerCase().startsWith(truncated),
      );
      if (isTargeted) {
        return {
          value: flag.type === 'boolean' ? flag.enabled : (flag.value ?? flag.defaultValue),
          reason: 'user_targeted',
        };
      }
    }

    // Network targeting
    if (flag.targetNetworks?.length && context.network) {
      if (!flag.targetNetworks.includes(context.network)) {
        return { value: flag.defaultValue, reason: 'network_not_targeted' };
      }
    }

    // Segment targeting
    if (flag.targetSegments?.length && context.segments?.length) {
      const hasSegment = flag.targetSegments.some((seg) =>
        context.segments?.includes(seg),
      );
      if (hasSegment) {
        return {
          value: flag.type === 'boolean' ? flag.enabled : (flag.value ?? flag.defaultValue),
          reason: 'segment_matched',
        };
      }
    }

    // Rollout
    if (flag.type === 'rollout' && flag.rolloutPercentage !== undefined) {
      const userId = context.address || 'anonymous';
      const bucket = this.hashBucket(`${key}:${userId}`);
      const inRollout = bucket < flag.rolloutPercentage;
      return {
        value: inRollout,
        reason: `rollout_${inRollout ? 'included' : 'excluded'}_${bucket}`,
      };
    }

    return {
      value: flag.type === 'boolean' ? flag.enabled : (flag.value ?? flag.defaultValue),
      reason: 'default',
    };
  }

  private hashBucket(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}
