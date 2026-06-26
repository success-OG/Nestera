import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserService } from '../user/user.service';
import { StellarService } from '../blockchain/stellar.service';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class SweepTasksService {
  private readonly logger = new Logger(SweepTasksService.name);

  constructor(
    private readonly userService: UserService,
    private readonly stellarService: StellarService,
  ) {}

  // Runs every minute; adjust schedule as needed
  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_MINUTE)
  async handleSweep() {
    this.logger.log('Starting sweep job');

    // Fetch users who have auto-sweep enabled. The UserService method is expected
    // to return users with their sweep preferences. If not present, this should
    // be implemented on the UserService / user entity.
    const usersWithSweep: any[] = (this.userService as any)
      .findUsersWithAutoSweep
      ? await (this.userService as any).findUsersWithAutoSweep()
      : [];

    this.logger.log(`Found ${usersWithSweep.length} users with auto-sweep`);

    for (const user of usersWithSweep) {
      try {
        const threshold = user.sweepThreshold ?? 0;

        // Attempt to fetch balance from StellarService if available; otherwise
        // fall back to a stubbed value (0) so the job remains safe.
        const balance =
          (this.stellarService as any).getAccountBalance?.(user.publicKey) ??
          user.mockBalance ??
          0;

        const excess = Number(balance) - Number(threshold);

        if (excess > 0) {
          this.logger.log(
            `User ${user.id} has excess funds: ${excess} (balance ${balance}, threshold ${threshold})`,
          );

          // Stubbed transfer logic — replace with real transfer via StellarService / SavingsService
          await this.transferToSavingsStub(user, excess);
        }
      } catch (err) {
        this.logger.error(`Sweep failed for user ${user.id}`, err as Error);
      }
    }

    this.logger.log('Sweep job complete');
  }

  private async transferToSavingsStub(user: any, amount: number) {
    // This is intentionally a stub. Real implementation should:
    // - Build and sign a Stellar transaction (or call a savings contract)
    // - Move funds from user wallet to savings product
    // - Record the sweep transaction in the DB
    this.logger.log(
      `Stub: transferring ${amount} from ${user.id} (pub ${user.publicKey}) to savings product`,
    );
    return Promise.resolve(true);
  }
}
