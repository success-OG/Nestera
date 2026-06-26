import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateSavingsGoalSharingTables1800200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'savings_goal_shares',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'goalId', type: 'uuid', isNullable: false },
          { name: 'ownerId', type: 'uuid', isNullable: false },
          {
            name: 'visibility',
            type: 'enum',
            enum: ['PRIVATE', 'FRIENDS', 'PUBLIC', 'UNLISTED'],
            default: "'PRIVATE'",
            isNullable: false,
          },
          {
            name: 'shareToken',
            type: 'varchar',
            length: '80',
            isNullable: true,
          },
          { name: 'expiresAt', type: 'timestamp', isNullable: true },
          { name: 'revokedAt', type: 'timestamp', isNullable: true },
          {
            name: 'isDirectoryListed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'showProgress',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'showTargetAmount',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'showOwnerName',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'allowSocialSharing',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'allowProgressUpdates',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          { name: 'allowedUserIds', type: 'jsonb', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'savings_goal_shares',
      new TableForeignKey({
        columnNames: ['goalId'],
        referencedTableName: 'savings_goals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'savings_goal_shares',
      new TableForeignKey({
        columnNames: ['ownerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'savings_goal_shares',
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARES_GOAL_ID',
        columnNames: ['goalId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'savings_goal_shares',
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARES_TOKEN',
        columnNames: ['shareToken'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'savings_goal_shares',
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARES_DIRECTORY',
        columnNames: ['visibility', 'isDirectoryListed'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'savings_goal_share_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'shareId', type: 'uuid', isNullable: false },
          { name: 'goalId', type: 'uuid', isNullable: false },
          { name: 'viewerId', type: 'uuid', isNullable: true },
          {
            name: 'eventType',
            type: 'enum',
            enum: [
              'LINK_CREATED',
              'VIEW',
              'DIRECTORY_VIEW',
              'SOCIAL_SHARE',
              'PROGRESS_UPDATE',
              'PERMISSION_UPDATED',
              'REVOKED',
            ],
            isNullable: false,
          },
          { name: 'platform', type: 'varchar', length: '32', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'savings_goal_share_events',
      new TableForeignKey({
        columnNames: ['shareId'],
        referencedTableName: 'savings_goal_shares',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'savings_goal_share_events',
      new TableForeignKey({
        columnNames: ['goalId'],
        referencedTableName: 'savings_goals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'savings_goal_share_events',
      new TableForeignKey({
        columnNames: ['viewerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    for (const index of [
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARE_EVENTS_SHARE_ID',
        columnNames: ['shareId'],
      }),
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARE_EVENTS_GOAL_ID',
        columnNames: ['goalId'],
      }),
      new TableIndex({
        name: 'IDX_SAVINGS_GOAL_SHARE_EVENTS_TYPE',
        columnNames: ['eventType'],
      }),
    ]) {
      await queryRunner.createIndex('savings_goal_share_events', index);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('savings_goal_share_events');
    await queryRunner.dropTable('savings_goal_shares');
  }
}
