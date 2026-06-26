import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateChallengesSystem1714046400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create challenges table
    await queryRunner.createTable(
      new Table({
        name: 'challenges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'deposit_streak',
              'goal_creation',
              'referral',
              'savings_target',
              'transaction_count',
            ],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
            default: "'draft'",
          },
          {
            name: 'startDate',
            type: 'timestamp',
          },
          {
            name: 'endDate',
            type: 'timestamp',
          },
          {
            name: 'rewardConfiguration',
            type: 'jsonb',
          },
          {
            name: 'rules',
            type: 'jsonb',
          },
          {
            name: 'imageUrl',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'badgeName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'participantCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'completionCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'isVisible',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdBy',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for challenges table
    await queryRunner.createIndex(
      'challenges',
      new TableIndex({
        name: 'IDX_challenges_type_status',
        columnNames: ['type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'challenges',
      new TableIndex({
        name: 'IDX_challenges_start_end_date',
        columnNames: ['startDate', 'endDate'],
      }),
    );

    await queryRunner.createIndex(
      'challenges',
      new TableIndex({
        name: 'IDX_challenges_status',
        columnNames: ['status'],
      }),
    );

    // Create user_challenges table
    await queryRunner.createTable(
      new Table({
        name: 'user_challenges',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'challengeId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'completed', 'failed', 'expired'],
            default: "'active'",
          },
          {
            name: 'progressPercentage',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'progressMetadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rewardClaimed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'rewardClaimedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'attemptCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for user_challenges table
    await queryRunner.createIndex(
      'user_challenges',
      new TableIndex({
        name: 'IDX_user_challenges_user_challenge',
        columnNames: ['userId', 'challengeId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'user_challenges',
      new TableIndex({
        name: 'IDX_user_challenges_user_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_challenges',
      new TableIndex({
        name: 'IDX_user_challenges_challenge_status',
        columnNames: ['challengeId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_challenges',
      new TableIndex({
        name: 'IDX_user_challenges_status_joined',
        columnNames: ['status', 'joinedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_challenges table
    await queryRunner.dropTable('user_challenges', true);

    // Drop challenges table
    await queryRunner.dropTable('challenges', true);
  }
}
