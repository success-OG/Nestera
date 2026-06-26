import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeatureFlagsTable1775300000000 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feature_flags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'key', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'default_value', type: 'jsonb', isNullable: true },
          { name: 'type', type: 'varchar', length: '20', isNullable: false },
          { name: 'enabled', type: 'boolean', default: false },
          { name: 'value', type: 'jsonb', isNullable: true },
          { name: 'rollout_percentage', type: 'integer', isNullable: true },
          { name: 'target_users', type: 'jsonb', isNullable: true },
          { name: 'target_networks', type: 'jsonb', isNullable: true },
          { name: 'target_segments', type: 'jsonb', isNullable: true },
          { name: 'force_disabled', type: 'boolean', default: false },
          { name: 'tags', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'feature_flags',
      new TableIndex({ name: 'IDX_FEATURE_FLAGS_KEY', columnNames: ['key'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('feature_flags');
  }
}
