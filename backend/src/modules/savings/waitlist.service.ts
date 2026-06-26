import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import {
  WaitlistEvent,
  WaitlistEventType,
} from './entities/waitlist-event.entity';
import { SavingsProduct } from './entities/savings-product.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(SavingsProduct)
    private readonly productRepo: Repository<SavingsProduct>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Optional()
    @InjectRepository(WaitlistEvent)
    private readonly eventRepo?: Repository<WaitlistEvent>,
  ) {}

  /**
   * Add a user to a product waitlist. Returns the user's 1-based position.
   * This method is idempotent (if already waiting, returns existing position).
   */
  async joinWaitlist(userId: string, productId: string, priority = 0) {
    const [product, user] = await Promise.all([
      this.productRepo.findOneBy({ id: productId }),
      this.userRepo.findOne({ where: { id: userId }, select: ['id', 'email'] }),
    ]);

    if (!product) throw new NotFoundException('Product not found');

    // If product is available for subscription, reject — no waitlist needed
    if (
      product.isActive &&
      product.capacity == null &&
      product.maxCapacity == null
    ) {
      throw new BadRequestException('Product is currently available');
    }

    // Idempotent: return existing pending entry if present
    const existing = await this.waitlistRepo
      .createQueryBuilder('w')
      .where('w.productId = :productId', { productId })
      .andWhere('w.userId = :userId', { userId })
      .andWhere('w.notifiedAt IS NULL')
      .getOne();

    if (existing) {
      const position = await this.getPosition(existing.id);
      return { entry: existing, position };
    }

    const entry = this.waitlistRepo.create({ userId, productId, priority });
    const saved = await this.waitlistRepo.save(entry);
    // record JOIN event for analytics
    try {
      if (this.eventRepo) {
        await this.eventRepo.save(
          this.eventRepo.create({
            entryId: saved.id,
            userId,
            productId,
            type: 'JOIN',
            metadata: null,
          }),
        );
      }
    } catch (e) {
      // non-fatal
    }
    const position = await this.getPosition(saved.id);
    return { entry: saved, position };
  }

  /** Compute 1-based position for an entry id */
  async getPosition(entryId: string): Promise<number> {
    const target = await this.waitlistRepo.findOneBy({ id: entryId });
    if (!target) throw new NotFoundException('Waitlist entry not found');

    const count = await this.waitlistRepo
      .createQueryBuilder('w')
      .where('w.productId = :productId', { productId: target.productId })
      .andWhere('w.notifiedAt IS NULL')
      .andWhere(
        '(w.priority > :priority OR (w.priority = :priority AND w.createdAt <= :createdAt))',
        { priority: target.priority, createdAt: target.createdAt },
      )
      .getCount();

    return count; // count is 1-based position (includes target)
  }

  /**
   * Fetch next N pending waitlist entries for a product in priority/FCFS order
   */
  async popNext(productId: string, limit = 1): Promise<WaitlistEntry[]> {
    const entries = await this.waitlistRepo
      .createQueryBuilder('w')
      .where('w.productId = :productId', { productId })
      .andWhere('w.notifiedAt IS NULL')
      .orderBy('w.priority', 'DESC')
      .addOrderBy('w.createdAt', 'ASC')
      .limit(limit)
      .getMany();

    return entries;
  }

  async markNotified(entryIds: string[]) {
    if (!entryIds.length) return;
    await this.waitlistRepo
      .createQueryBuilder()
      .update(WaitlistEntry)
      .set({ notifiedAt: new Date() })
      .where('id IN (:...ids)', { ids: entryIds })
      .execute();
  }

  /** Fetch a user's active waitlist entry for a product */
  async getUserEntry(userId: string, productId: string) {
    const entry = await this.waitlistRepo
      .createQueryBuilder('w')
      .where('w.productId = :productId', { productId })
      .andWhere('w.userId = :userId', { userId })
      .andWhere('w.notifiedAt IS NULL')
      .getOne();

    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  /** Leave a product waitlist */
  async leaveWaitlist(userId: string, productId: string) {
    const entry = await this.getUserEntry(userId, productId);

    try {
      if (this.eventRepo) {
        await this.eventRepo.save(
          this.eventRepo.create({
            entryId: entry.id,
            userId,
            productId,
            type: 'LEAVE' as WaitlistEventType,
            metadata: null,
          }),
        );
      }
    } catch (e) {
      // non-fatal
    }

    await this.waitlistRepo.delete({ id: entry.id });
  }

  /** Record that a user has converted from the waitlist (subscribed to product) */
  async recordConversion(userId: string, productId: string) {
    if (!this.eventRepo) return;

    // A user converts if they had a waitlist event. We'll find their most recent NOTIFY event to link ACCEPT to, or just create ACCEPT with null entryId if we can't tie to it.
    // Let's find their most recent NOTIFY or JOIN event for this product.
    const lastEvent = await this.eventRepo.findOne({
      where: [
        { userId, productId, type: 'NOTIFY' },
        { userId, productId, type: 'JOIN' },
      ],
      order: { createdAt: 'DESC' },
    });

    if (!lastEvent) return; // User was never on waitlist, no conversion to record.

    // Record ACCEPT event
    try {
      await this.eventRepo.save(
        this.eventRepo.create({
          entryId: lastEvent.entryId,
          userId,
          productId,
          type: 'ACCEPT' as WaitlistEventType,
          metadata: null,
        }),
      );
    } catch (e) {
      // ignore
    }

    // Attempt to remove their active waitlist entry if they somehow subbed while pending
    try {
      await this.waitlistRepo.delete({
        userId,
        productId,
        notifiedAt: IsNull(),
      });
    } catch (e) {
      void e;
    }
  }
}
