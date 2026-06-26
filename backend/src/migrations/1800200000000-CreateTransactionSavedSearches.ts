import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTransactionSavedSearches1800200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transaction_saved_searches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '280',
            isNullable: true,
          },
          {
            name: 'query',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: 'false',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'transaction_saved_searches',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'transaction_saved_searches',
      new TableIndex({
        name: 'idx_transaction_saved_searches_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_transaction_saved_searches_user_default"
      ON "transaction_saved_searches" ("userId")
      WHERE "isDefault" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "uq_transaction_saved_searches_user_default"',
    );
    await queryRunner.dropIndex(
      'transaction_saved_searches',
      'idx_transaction_saved_searches_user_id',
    );
    const table = await queryRunner.getTable('transaction_saved_searches');
    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('userId'),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('transaction_saved_searches', foreignKey);
    }
    await queryRunner.dropTable('transaction_saved_searches');
  }
}
