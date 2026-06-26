import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateReferralsTable1776000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create referrals table
    await queryRunner.createTable(
      new Table({
        name: 'referrals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'referrerId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'refereeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '20',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'rewarded', 'expired', 'fraudulent'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'rewardAmount',
            type: 'decimal',
            precision: 18,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rewardedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_REFERRALS_REFERRER',
        columnNames: ['referrerId'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_REFERRALS_REFEREE',
        columnNames: ['refereeId'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_REFERRALS_CODE',
        columnNames: ['referralCode'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_REFERRALS_STATUS',
        columnNames: ['status'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        columnNames: ['referrerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        columnNames: ['refereeId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // Create referral_campaigns table
    await queryRunner.createTable(
      new Table({
        name: 'referral_campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rewardAmount',
            type: 'decimal',
            precision: 18,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'refereeRewardAmount',
            type: 'decimal',
            precision: 18,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'minDepositAmount',
            type: 'decimal',
            precision: 18,
            scale: 7,
            default: 0,
            isNullable: false,
          },
          {
            name: 'maxRewardsPerUser',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'startDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key for campaignId in referrals table
    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'referral_campaigns',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('referrals');
    await queryRunner.dropTable('referral_campaigns');
  }
}
