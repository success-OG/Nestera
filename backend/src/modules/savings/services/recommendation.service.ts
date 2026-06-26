import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SavingsProduct,
  SavingsProductType,
} from '../entities/savings-product.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../entities/user-subscription.entity';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../entities/savings-goal.entity';
import {
  Transaction,
  TxType,
} from '../../transactions/entities/transaction.entity';
import { ProductRecommendationDto } from '../dto/recommendation-response.dto';

interface UserProfile {
  avgTransactionAmount: number;
  transactionCount: number;
  depositFrequency: number;
  riskTolerance: 'low' | 'medium' | 'high';
  activeSubscriptionTypes: SavingsProductType[];
  totalInvested: number;
  hasGoals: boolean;
  longestGoalMonths: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(SavingsProduct)
    private readonly productRepository: Repository<SavingsProduct>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(SavingsGoal)
    private readonly goalRepository: Repository<SavingsGoal>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async getRecommendations(
    userId: string,
  ): Promise<ProductRecommendationDto[]> {
    const [profile, products] = await Promise.all([
      this.buildUserProfile(userId),
      this.productRepository.find({ where: { isActive: true } }),
    ]);

    if (!products.length) {
      return [];
    }

    const scored = products.map((product) => ({
      product,
      score: this.scoreProduct(product, profile),
      reason: this.generateReason(product, profile),
      projectedEarnings: this.projectEarnings(product, profile),
    }));

    // Sort by score descending, return top 5
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5).map((s) => ({
      productId: s.product.id,
      productName: s.product.name,
      matchScore: Number(s.score.toFixed(2)),
      reason: s.reason,
      projectedEarnings: Number(s.projectedEarnings.toFixed(2)),
    }));
  }

  private async buildUserProfile(userId: string): Promise<UserProfile> {
    const [subscriptions, goals, transactions] = await Promise.all([
      this.subscriptionRepository.find({
        where: { userId },
        relations: ['product'],
      }),
      this.goalRepository.find({ where: { userId } }),
      this.transactionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    ]);

    const deposits = transactions.filter((t) => t.type === TxType.DEPOSIT);
    const avgTransactionAmount =
      deposits.length > 0
        ? deposits.reduce((sum, t) => sum + Number(t.amount), 0) /
          deposits.length
        : 0;

    // Estimate deposit frequency: deposits per month over last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentDeposits = deposits.filter(
      (t) => new Date(t.createdAt) >= ninetyDaysAgo,
    );
    const depositFrequency = recentDeposits.length / 3; // per month

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    );
    const totalInvested = activeSubscriptions.reduce(
      (sum, s) => sum + Number(s.amount),
      0,
    );
    const activeSubscriptionTypes = [
      ...new Set(
        activeSubscriptions.map((s) => s.product?.type).filter(Boolean),
      ),
    ] as SavingsProductType[];

    // Risk tolerance: based on product mix and withdrawal history
    const withdrawals = transactions.filter((t) => t.type === TxType.WITHDRAW);
    const hasLockedProducts = activeSubscriptionTypes.includes(
      SavingsProductType.FIXED,
    );
    const withdrawalRatio =
      transactions.length > 0 ? withdrawals.length / transactions.length : 0;

    let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
    if (hasLockedProducts && withdrawalRatio < 0.1) {
      riskTolerance = 'high';
    } else if (withdrawalRatio > 0.3 || !hasLockedProducts) {
      riskTolerance = 'low';
    }

    // Longest goal horizon in months
    const activeGoals = goals.filter(
      (g) => g.status === SavingsGoalStatus.IN_PROGRESS,
    );
    let longestGoalMonths = 0;
    for (const goal of activeGoals) {
      const months =
        (new Date(goal.targetDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24 * 30);
      if (months > longestGoalMonths) {
        longestGoalMonths = months;
      }
    }

    return {
      avgTransactionAmount,
      transactionCount: transactions.length,
      depositFrequency,
      riskTolerance,
      activeSubscriptionTypes,
      totalInvested,
      hasGoals: activeGoals.length > 0,
      longestGoalMonths: Math.max(0, Math.round(longestGoalMonths)),
    };
  }

  private scoreProduct(product: SavingsProduct, profile: UserProfile): number {
    let score = 0.5; // base score

    // Risk alignment (+0.2)
    if (
      profile.riskTolerance === 'high' &&
      product.type === SavingsProductType.FIXED
    ) {
      score += 0.2;
    } else if (
      profile.riskTolerance === 'low' &&
      product.type === SavingsProductType.FLEXIBLE
    ) {
      score += 0.2;
    } else if (profile.riskTolerance === 'medium') {
      score += 0.1;
    }

    // Goal alignment (+0.15)
    if (profile.hasGoals) {
      if (
        profile.longestGoalMonths >= 6 &&
        product.type === SavingsProductType.FIXED &&
        product.tenureMonths &&
        product.tenureMonths <= profile.longestGoalMonths
      ) {
        score += 0.15;
      } else if (
        profile.longestGoalMonths < 6 &&
        product.type === SavingsProductType.FLEXIBLE
      ) {
        score += 0.15;
      }
    }

    // APY boost — higher rate products get a bump (+0.1)
    const interestRate = Number(product.interestRate);
    if (interestRate >= 5) {
      score += 0.1;
    } else if (interestRate >= 2) {
      score += 0.05;
    }

    // Diversification: boost products the user doesn't already hold (+0.1)
    if (!profile.activeSubscriptionTypes.includes(product.type)) {
      score += 0.1;
    }

    // Amount fit: product min/max fits user's average transaction (+0.05)
    if (
      profile.avgTransactionAmount >= Number(product.minAmount) &&
      profile.avgTransactionAmount <= Number(product.maxAmount)
    ) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  private generateReason(
    product: SavingsProduct,
    profile: UserProfile,
  ): string {
    if (
      profile.hasGoals &&
      profile.longestGoalMonths >= 6 &&
      product.type === SavingsProductType.FIXED
    ) {
      return `Matches your long-term savings goal with a ${product.tenureMonths}-month lock period`;
    }

    if (
      !profile.activeSubscriptionTypes.includes(product.type) &&
      product.type === SavingsProductType.FIXED
    ) {
      return 'Diversify your portfolio with a locked savings product for higher returns';
    }

    if (
      !profile.activeSubscriptionTypes.includes(product.type) &&
      product.type === SavingsProductType.FLEXIBLE
    ) {
      return 'Add flexibility to your portfolio with instant access to your funds';
    }

    if (Number(product.interestRate) >= 5) {
      return `High yield opportunity at ${product.interestRate}% APY`;
    }

    if (profile.riskTolerance === 'low') {
      return 'Low-risk option suited to your conservative savings pattern';
    }

    return `Recommended based on your savings profile and ${product.interestRate}% APY`;
  }

  private projectEarnings(
    product: SavingsProduct,
    profile: UserProfile,
  ): number {
    // Project based on user's average deposit or current invested amount
    const principal =
      profile.avgTransactionAmount > 0
        ? profile.avgTransactionAmount
        : Number(product.minAmount);

    const rate = Number(product.interestRate) / 100;
    const months = product.tenureMonths || 12;

    // Compound interest: P * (1 + r/12)^months - P
    const compounded = principal * Math.pow(1 + rate / 12, months) - principal;

    return Math.max(0, compounded);
  }
}
