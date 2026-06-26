import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserWallet } from '../user/entities/user-wallet.entity';
import {
  Transaction,
  TxType,
} from '../transactions/entities/transaction.entity';
import { SavingsProduct } from '../savings/entities/savings-product.entity';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../savings/entities/savings-goal.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TestDataGeneratorService {
  private readonly logger = new Logger(TestDataGeneratorService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserWallet)
    private userWalletRepository: Repository<UserWallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(SavingsProduct)
    private savingsProductRepository: Repository<SavingsProduct>,
    @InjectRepository(SavingsGoal)
    private savingsGoalRepository: Repository<SavingsGoal>,
  ) {}

  async generateTestData(): Promise<{
    users: User[];
    transactions: Transaction[];
    savingsGoals: SavingsGoal[];
  }> {
    this.logger.log('Generating test data...');
    const users: User[] = [];
    const transactions: Transaction[] = [];
    const savingsGoals: SavingsGoal[] = [];

    for (let i = 0; i < 5; i++) {
      const user = await this.createTestUser(i);
      users.push(user);

      const wallet = await this.createTestWallet(user);

      for (let j = 0; j < 5; j++) {
        const transaction = await this.createTestTransaction(user, wallet, j);
        transactions.push(transaction);
      }

      for (let k = 0; k < 2; k++) {
        const goal = await this.createTestSavingsGoal(user);
        savingsGoals.push(goal);
      }
    }

    this.logger.log(
      `Generated ${users.length} users, ${transactions.length} transactions, and ${savingsGoals.length} savings goals`,
    );

    return { users, transactions, savingsGoals };
  }

  private async createTestUser(index: number): Promise<User> {
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const user = this.userRepository.create({
      email: `testuser${index + 1}@example.com`,
      name: `Test User ${index + 1}`,
      password: hashedPassword,
      role: 'USER',
      kycStatus: index % 2 === 0 ? 'APPROVED' : 'NOT_SUBMITTED',
      tier: index < 2 ? 'FREE' : index < 4 ? 'VERIFIED' : 'PREMIUM',
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  private async createTestWallet(user: User): Promise<UserWallet> {
    const wallet = this.userWalletRepository.create({
      userId: user.id,
      address: `G${uuidv4().replace(/-/g, '').slice(0, 56)}`,
      isPrimary: true,
    });
    return this.userWalletRepository.save(wallet);
  }

  private async createTestTransaction(
    user: User,
    wallet: UserWallet,
    index: number,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      userId: user.id,
      type: index % 2 === 0 ? TxType.DEPOSIT : TxType.WITHDRAW,
      amount: (Math.random() * 1000).toFixed(2),
      txHash: `tx_${uuidv4()}`,
    });
    return this.transactionRepository.save(transaction);
  }

  private async createTestSavingsGoal(user: User): Promise<SavingsGoal> {
    const goal = this.savingsGoalRepository.create({
      userId: user.id,
      goalName: `Test Goal ${uuidv4().slice(0, 8)}`,
      targetAmount: Math.floor(Math.random() * 10000 + 1000),
      targetDate: new Date(
        Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000,
      ),
      status: SavingsGoalStatus.IN_PROGRESS,
    });
    return this.savingsGoalRepository.save(goal);
  }
}
