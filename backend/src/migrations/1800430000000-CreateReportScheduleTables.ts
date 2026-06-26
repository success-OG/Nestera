import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateReportScheduleTables1800430000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'report_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isNullable: false },
          {
            name: 'reportType',
            type: 'enum',
            enum: ['DAILY_SUMMARY', 'WEEKLY_ANALYTICS', 'MONTHLY_STATEMENT'],
            isNullable: false,
          },
          {
            name: 'format',
            type: 'enum',
            enum: ['PDF', 'CSV', 'EXCEL'],
            default: "'PDF'",
            isNullable: false,
          },
          {
            name: 'frequency',
            type: 'enum',
            enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
            default: "'ACTIVE'",
            isNullable: false,
          },
          { name: 'emailDelivery', type: 'boolean', default: true },
          { name: 'nextRunAt', type: 'timestamptz', isNullable: false },
          { name: 'isAdmin', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'report_schedules',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'report_archives',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'scheduleId', type: 'uuid', isNullable: true },
          {
            name: 'reportType',
            type: 'enum',
            enum: ['DAILY_SUMMARY', 'WEEKLY_ANALYTICS', 'MONTHLY_STATEMENT'],
            isNullable: false,
          },
          {
            name: 'format',
            type: 'enum',
            enum: ['PDF', 'CSV', 'EXCEL'],
            isNullable: false,
          },
          { name: 'storagePath', type: 'varchar', isNullable: false },
          { name: 'filename', type: 'varchar', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['GENERATED', 'DELIVERED', 'FAILED'],
            default: "'GENERATED'",
            isNullable: false,
          },
          { name: 'periodLabel', type: 'varchar', isNullable: true },
          { name: 'generatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'report_archives',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'report_archives',
      new TableForeignKey({
        columnNames: ['scheduleId'],
        referencedTableName: 'report_schedules',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'report_archives',
      new TableIndex({
        name: 'IDX_REPORT_ARCHIVES_USER_ID',
        columnNames: ['userId', 'generatedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('report_archives');
    await queryRunner.dropTable('report_schedules');
  }
}
