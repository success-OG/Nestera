import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateKycDocumentsTable1800420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'kyc_documents',
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
            name: 'documentType',
            type: 'enum',
            enum: [
              'PASSPORT',
              'NATIONAL_ID',
              'DRIVERS_LICENSE',
              'UTILITY_BILL',
              'SELFIE',
            ],
            isNullable: false,
          },
          { name: 'encryptedStoragePath', type: 'varchar', isNullable: false },
          { name: 'originalFilename', type: 'varchar', isNullable: false },
          { name: 'mimeType', type: 'varchar', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'],
            default: "'UPLOADED'",
            isNullable: false,
          },
          { name: 'verificationId', type: 'uuid', isNullable: true },
          { name: 'rejectionReason', type: 'text', isNullable: true },
          { name: 'reviewedBy', type: 'varchar', isNullable: true },
          { name: 'reviewedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'kyc_documents',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'kyc_documents',
      new TableForeignKey({
        columnNames: ['verificationId'],
        referencedTableName: 'kyc_verifications',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'kyc_documents',
      new TableIndex({
        name: 'IDX_KYC_DOCUMENTS_USER_ID',
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('kyc_documents');
  }
}
