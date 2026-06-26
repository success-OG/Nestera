import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddAuditLogMissingColumns1775300000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make existing NOT NULL columns nullable to match entity (migration was stricter than entity)
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "correlation_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "endpoint" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "method" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "action" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "actor" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "resource_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "status_code" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "duration_ms" DROP NOT NULL`,
    );

    // Add missing columns
    await queryRunner.addColumns('audit_logs', [
      new TableColumn({
        name: 'ip_address',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'user_agent',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'previous_value',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'new_value',
        type: 'jsonb',
        isNullable: true,
      }),
    ]);

    // Add missing indexes
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_resource_type',
        columnNames: ['resource_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('audit_logs', 'idx_audit_logs_resource_type');
    await queryRunner.dropColumns('audit_logs', [
      'ip_address',
      'user_agent',
      'description',
      'previous_value',
      'new_value',
    ]);
  }
}
