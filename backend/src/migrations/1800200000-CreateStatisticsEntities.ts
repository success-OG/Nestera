import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStatisticsEntities1800200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create system_statistics table
    await queryRunner.createTable(
      new Table({
        name: 'system_statistics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'metricType',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'totalUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'activeUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'newUsersCount',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'failedTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalTransactionVolume',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgTransactionAmount',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalSavingsAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'activeSavingsAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalValueLocked',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgApy',
            type: 'numeric',
            precision: 8,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalMedicalClaims',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'approvedClaims',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalClaimsAmount',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'activeDisputes',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'systemHealthScore',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 100,
          },
          {
            name: 'additionalMetrics',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'IDX_system_statistics_timestamp',
            columnNames: ['timestamp'],
            isUnique: true,
          },
          {
            name: 'IDX_system_statistics_metric_type',
            columnNames: ['metricType', 'timestamp'],
          },
        ],
      }),
    );

    // Create user_growth_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'user_growth_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metricPeriod',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'totalUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'newUsersCount',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'activeUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'inactiveUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'churnedUsers',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'retentionRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'churnRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'growthRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'usersByRegion',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'usersByType',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'usersBySegment',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_user_growth_metrics_date',
            columnNames: ['date'],
          },
          {
            name: 'IDX_user_growth_metrics_date_period',
            columnNames: ['date', 'metricPeriod'],
          },
        ],
      }),
    );

    // Create transaction_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'transaction_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metricPeriod',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'totalTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'successfulTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'failedTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'pendingTransactions',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalVolume',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgTransactionAmount',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'minTransactionAmount',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'maxTransactionAmount',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'successRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'failureRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgGasUsed',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalGasSpent',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'transactionsByType',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'transactionsByStatus',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'volumeByType',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_transaction_metrics_date',
            columnNames: ['date'],
          },
          {
            name: 'IDX_transaction_metrics_date_period',
            columnNames: ['date', 'metricPeriod'],
          },
        ],
      }),
    );

    // Create savings_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'savings_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metricPeriod',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'totalAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'activeAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'newAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'closedAccounts',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalValueLocked',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'inflow',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'outflow',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgApy',
            type: 'numeric',
            precision: 8,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'minApy',
            type: 'numeric',
            precision: 8,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'maxApy',
            type: 'numeric',
            precision: 8,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'totalInterestEarned',
            type: 'numeric',
            precision: 20,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'accountGrowthRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'tvlGrowthRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'accountsByProduct',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tvlByProduct',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'apyByProduct',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_savings_metrics_date',
            columnNames: ['date'],
          },
          {
            name: 'IDX_savings_metrics_date_period',
            columnNames: ['date', 'metricPeriod'],
          },
        ],
      }),
    );

    // Create system_health_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'system_health_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'healthScore',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 100,
          },
          {
            name: 'apiUptime',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 100,
          },
          {
            name: 'blockchainUptime',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 100,
          },
          {
            name: 'totalRequests',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'successfulRequests',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'failedRequests',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'avgResponseTime',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'p95ResponseTime',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'p99ResponseTime',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: false,
            default: 0,
          },
          {
            name: 'memoryUsed',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'memoryAvailable',
            type: 'bigint',
            isNullable: false,
            default: 0,
          },
          {
            name: 'cpuUsage',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'databaseConnections',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'cacheHitRate',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'diskUsage',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'serviceStatus',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'alerts',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_system_health_metrics_timestamp',
            columnNames: ['timestamp'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.dropIndex(
      'system_statistics',
      'IDX_system_statistics_timestamp',
    );
    await queryRunner.dropIndex(
      'system_statistics',
      'IDX_system_statistics_metric_type',
    );
    await queryRunner.dropIndex(
      'user_growth_metrics',
      'IDX_user_growth_metrics_date',
    );
    await queryRunner.dropIndex(
      'user_growth_metrics',
      'IDX_user_growth_metrics_date_period',
    );
    await queryRunner.dropIndex(
      'transaction_metrics',
      'IDX_transaction_metrics_date',
    );
    await queryRunner.dropIndex(
      'transaction_metrics',
      'IDX_transaction_metrics_date_period',
    );
    await queryRunner.dropIndex('savings_metrics', 'IDX_savings_metrics_date');
    await queryRunner.dropIndex(
      'savings_metrics',
      'IDX_savings_metrics_date_period',
    );
    await queryRunner.dropIndex(
      'system_health_metrics',
      'IDX_system_health_metrics_timestamp',
    );

    // Drop tables
    await queryRunner.dropTable('system_health_metrics');
    await queryRunner.dropTable('savings_metrics');
    await queryRunner.dropTable('transaction_metrics');
    await queryRunner.dropTable('user_growth_metrics');
    await queryRunner.dropTable('system_statistics');
  }
}
