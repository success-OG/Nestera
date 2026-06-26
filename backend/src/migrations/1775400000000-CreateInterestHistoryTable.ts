import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateInterestHistoryTable1775400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'interest_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'subscriptionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'productId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'principalAmount',
            type: 'decimal',
            precision: 20,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'interestRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'interestEarned',
            type: 'decimal',
            precision: 20,
            scale: 7,
            isNullable: false,
          },
          {
            name: 'calculationDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'periodDays',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'runId',
            type: 'uuid',
            isNullable: false,
            comment: 'Groups all records from a single scheduler run',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'interest_history',
      new TableForeignKey({
        columnNames: ['subscriptionId'],
        referencedTableName: 'user_subscriptions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'interest_history',
      new TableIndex({
        name: 'IDX_INTEREST_HISTORY_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'interest_history',
      new TableIndex({
        name: 'IDX_INTEREST_HISTORY_SUBSCRIPTION_ID',
        columnNames: ['subscriptionId'],
      }),
    );

    await queryRunner.createIndex(
      'interest_history',
      new TableIndex({
        name: 'IDX_INTEREST_HISTORY_CALCULATION_DATE',
        columnNames: ['calculationDate'],
      }),
    );

    await queryRunner.createIndex(
      'interest_history',
      new TableIndex({
        name: 'IDX_INTEREST_HISTORY_RUN_ID',
        columnNames: ['runId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('interest_history');
  }
}
