import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFeedbackSubmissionsTable1800400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feedback_submissions',
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
            name: 'category',
            type: 'enum',
            enum: ['BUG_REPORT', 'FEATURE_REQUEST', 'GENERAL'],
            isNullable: false,
          },
          { name: 'rating', type: 'int', isNullable: true },
          { name: 'comment', type: 'text', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'SUBMITTED',
              'IN_REVIEW',
              'IN_PROGRESS',
              'RESOLVED',
              'CLOSED',
            ],
            default: "'SUBMITTED'",
            isNullable: false,
          },
          { name: 'screenshotUrl', type: 'varchar', isNullable: true },
          { name: 'adminNotes', type: 'text', isNullable: true },
          { name: 'resolvedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'feedback_submissions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'feedback_submissions',
      new TableIndex({
        name: 'IDX_FEEDBACK_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'feedback_submissions',
      new TableIndex({
        name: 'IDX_FEEDBACK_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'feedback_submissions',
      new TableIndex({
        name: 'IDX_FEEDBACK_CATEGORY',
        columnNames: ['category'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('feedback_submissions');
  }
}
