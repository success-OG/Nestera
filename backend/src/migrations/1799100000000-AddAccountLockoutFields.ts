import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountLockoutFields1799100000000 implements MigrationInterface {
  name = 'AddAccountLockoutFields1799100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" integer DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "lockedUntil" timestamp
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "isLocked" boolean DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "failedLoginAttempts"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "lockedUntil"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "isLocked"
    `);
  }
}
