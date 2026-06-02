import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './services/statistics.service';
import { StatisticsAggregationService } from './services/statistics-aggregation.service';
import { StatisticsUtilsService } from './services/statistics-utils.service';
import { SystemStatistics } from './entities/system-statistics.entity';
import { UserGrowthMetrics } from './entities/user-growth-metrics.entity';
import { TransactionMetrics } from './entities/transaction-metrics.entity';
import { SavingsMetrics } from './entities/savings-metrics.entity';
import { SystemHealthMetrics } from './entities/system-health-metrics.entity';
import { User } from '../user/entities/user.entity';
import {
  Transaction,
} from '../transactions/entities/transaction.entity';
import {
  UserSubscription,
} from '../savings/entities/user-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemStatistics,
      UserGrowthMetrics,
      TransactionMetrics,
      SavingsMetrics,
      SystemHealthMetrics,
      User,
      Transaction,
      UserSubscription,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of cached items
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsAggregationService, StatisticsUtilsService],
  exports: [StatisticsService, StatisticsUtilsService],
})
export class StatisticsModule {}
