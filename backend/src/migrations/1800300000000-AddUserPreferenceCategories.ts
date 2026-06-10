import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferenceCategories1800300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_contact_channel_enum') THEN
          CREATE TYPE "preferred_contact_channel_enum" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_visibility_enum') THEN
          CREATE TYPE "profile_visibility_enum" AS ENUM ('PUBLIC', 'PRIVATE', 'FRIENDS_ONLY');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'theme_preference_enum') THEN
          CREATE TYPE "theme_preference_enum" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'date_format_preference_enum') THEN
          CREATE TYPE "date_format_preference_enum" AS ENUM ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD');
        END IF;
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "preferredContactChannel" "preferred_contact_channel_enum" NOT NULL DEFAULT 'EMAIL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "newsletterSubscribed" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "profileVisibility" "profile_visibility_enum" NOT NULL DEFAULT 'PRIVATE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "dataSharingEnabled" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "personalizedAds" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "locationSharing" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "theme" "theme_preference_enum" NOT NULL DEFAULT 'SYSTEM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) NOT NULL DEFAULT 'en'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "dateFormat" "date_format_preference_enum" NOT NULL DEFAULT 'MM/DD/YYYY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "compactLayout" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "displayBalancesInFiat" BOOLEAN NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "displayBalancesInFiat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "compactLayout"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "dateFormat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "language"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "theme"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "locationSharing"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "personalizedAds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "dataSharingEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "profileVisibility"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "newsletterSubscribed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "preferredContactChannel"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "date_format_preference_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "theme_preference_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "profile_visibility_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "preferred_contact_channel_enum"`,
    );
  }
}
