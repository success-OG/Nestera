import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAnalyticsExportJobsTable1800300000000
  implements MigrationInterface
{
  name = 'CreateAnalyticsExportJobsTable1800300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'analytics_export_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'dataType',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'format',
            type: 'varchar',
            length: '16',
          },
          {
            name: 'range',
            type: 'varchar',
            length: '32',
            isNullable: true,
          },
          {
            name: 'fromDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'toDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: `'pending'`,
          },
          {
            name: 'queueJobId',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'filePath',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fileName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'requestPayload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'analytics_export_jobs',
      new TableIndex({
        name: 'IDX_ANALYTICS_EXPORT_JOBS_USER_STATUS',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'analytics_export_jobs',
      new TableIndex({
        name: 'IDX_ANALYTICS_EXPORT_JOBS_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'analytics_export_jobs',
      'IDX_ANALYTICS_EXPORT_JOBS_CREATED_AT',
    );
    await queryRunner.dropIndex(
      'analytics_export_jobs',
      'IDX_ANALYTICS_EXPORT_JOBS_USER_STATUS',
    );
    await queryRunner.dropTable('analytics_export_jobs');
  }
}
