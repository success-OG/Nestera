import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateGoalTransferTables1800410000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'goal_transfer_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'goalId', type: 'uuid', isNullable: false },
          { name: 'productId', type: 'uuid', isNullable: true },
          {
            name: 'amount',
            type: 'decimal',
            precision: 14,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'frequency',
            type: 'enum',
            enum: ['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
            default: "'ACTIVE'",
            isNullable: false,
          },
          { name: 'nextRunAt', type: 'timestamptz', isNullable: false },
          { name: 'retryCount', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'goal_transfer_schedules',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'goal_transfer_schedules',
      new TableForeignKey({
        columnNames: ['goalId'],
        referencedTableName: 'savings_goals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'goal_transfer_schedules',
      new TableIndex({
        name: 'IDX_GOAL_TRANSFER_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'goal_transfer_executions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'scheduleId', type: 'uuid', isNullable: false },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'goalId', type: 'uuid', isNullable: false },
          {
            name: 'amount',
            type: 'decimal',
            precision: 14,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['SUCCESS', 'FAILED'],
            isNullable: false,
          },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'executedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'goal_transfer_executions',
      new TableForeignKey({
        columnNames: ['scheduleId'],
        referencedTableName: 'goal_transfer_schedules',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('goal_transfer_executions');
    await queryRunner.dropTable('goal_transfer_schedules');
  }
}
