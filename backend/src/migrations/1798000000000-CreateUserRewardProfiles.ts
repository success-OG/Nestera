import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateUserRewardProfiles1798000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_reward_profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'totalPoints',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currentStreak',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'longestStreak',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'streakLastUpdatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isLeaderboardVisible',
            type: 'boolean',
            default: true,
            isNullable: false,
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

    await queryRunner.createIndex(
      'user_reward_profiles',
      new TableIndex({
        name: 'IDX_REWARD_PROFILES_TOTAL_POINTS',
        columnNames: ['totalPoints'],
      }),
    );

    await queryRunner.createIndex(
      'user_reward_profiles',
      new TableIndex({
        name: 'IDX_REWARD_PROFILES_LONGEST_STREAK',
        columnNames: ['longestStreak'],
      }),
    );

    await queryRunner.createIndex(
      'user_reward_profiles',
      new TableIndex({
        name: 'IDX_REWARD_PROFILES_VISIBILITY',
        columnNames: ['isLeaderboardVisible'],
      }),
    );

    await queryRunner.createForeignKey(
      'user_reward_profiles',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_reward_profiles');
  }
}
