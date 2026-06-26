import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserWalletsAndDataExport1796000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_wallets table (issue #524)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_wallets" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId"     UUID NOT NULL,
        "address"    VARCHAR(60) NOT NULL,
        "isPrimary"  BOOLEAN NOT NULL DEFAULT false,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_wallets_address" UNIQUE ("address"),
        CONSTRAINT "FK_user_wallets_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_wallets_userId" ON "user_wallets" ("userId")`,
    );

    // notification_preferences new columns (issue #525)
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "pushNotifications" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "smsNotifications" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "depositNotifications" BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "withdrawalNotifications" BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "goalNotifications" BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "governanceNotifications" BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "marketingNotifications" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "quietHoursStart" VARCHAR(5) NOT NULL DEFAULT '22:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "quietHoursEnd" VARCHAR(5) NOT NULL DEFAULT '08:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'digest_frequency_enum') THEN
          CREATE TYPE "digest_frequency_enum" AS ENUM ('instant', 'daily', 'weekly');
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "digestFrequency" "digest_frequency_enum" NOT NULL DEFAULT 'instant'`,
    );

    // data_export_requests table (issue #529)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status_enum') THEN
          CREATE TYPE "export_status_enum" AS ENUM ('pending', 'processing', 'ready', 'expired', 'failed');
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_export_requests" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId"      UUID NOT NULL,
        "status"      "export_status_enum" NOT NULL DEFAULT 'pending',
        "token"       VARCHAR(64) UNIQUE,
        "filePath"    VARCHAR,
        "expiresAt"   TIMESTAMP,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_data_export_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_data_export_userId" ON "data_export_requests" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "data_export_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "export_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "digestFrequency"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "digest_frequency_enum"`);
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "timezone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "quietHoursEnd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "quietHoursStart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "quietHoursEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "marketingNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "governanceNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "goalNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "withdrawalNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "depositNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "smsNotifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "pushNotifications"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets"`);
  }
}
