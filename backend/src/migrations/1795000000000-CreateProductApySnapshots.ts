import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProductApySnapshots1795000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'product_apy_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'productId', type: 'uuid' },
          {
            name: 'apy',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'tvlAmount',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: 'activeSubscribers',
            type: 'int',
            default: 0,
          },
          { name: 'snapshotDate', type: 'date' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'product_apy_snapshots',
      new TableIndex({
        name: 'IDX_apy_snapshots_product_date',
        columnNames: ['productId', 'snapshotDate'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'product_apy_snapshots',
      'IDX_apy_snapshots_product_date',
    );
    await queryRunner.dropTable('product_apy_snapshots');
  }
}
