import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookTables1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "webhook_status_enum" AS ENUM ('ACTIVE', 'DISABLED');
      CREATE TYPE "delivery_status_enum" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

      CREATE TABLE "webhook_subscriptions" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid NOT NULL,
        "url"         varchar NOT NULL,
        "secret"      varchar NOT NULL,
        "events"      text NOT NULL,
        "status"      "webhook_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "description" text,
        "createdAt"   timestamp NOT NULL DEFAULT now(),
        "updatedAt"   timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_webhook_sub_user" ON "webhook_subscriptions"("userId");

      CREATE TABLE "webhook_deliveries" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "subscriptionId" uuid NOT NULL REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE,
        "eventName"      varchar NOT NULL,
        "payload"        jsonb NOT NULL,
        "status"         "delivery_status_enum" NOT NULL DEFAULT 'PENDING',
        "responseStatus" int,
        "responseBody"   text,
        "errorMessage"   text,
        "attempts"       int NOT NULL DEFAULT 0,
        "nextRetryAt"    timestamp,
        "createdAt"      timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_webhook_del_sub"        ON "webhook_deliveries"("subscriptionId");
      CREATE INDEX "idx_webhook_del_status"     ON "webhook_deliveries"("status");
      CREATE INDEX "idx_webhook_del_next_retry" ON "webhook_deliveries"("nextRetryAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "webhook_deliveries";
      DROP TABLE IF EXISTS "webhook_subscriptions";
      DROP TYPE IF EXISTS "delivery_status_enum";
      DROP TYPE IF EXISTS "webhook_status_enum";
    `);
  }
}
