import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendGovernanceProposalsForStructuredCreation1797000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "createdByUserId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "type" varchar(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "action" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "requiredQuorum" numeric(20,8) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "quorumBps" integer NOT NULL DEFAULT 5000
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "proposalThreshold" numeric(20,8) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_proposals_createdByUserId"
      ON "governance_proposals" ("createdByUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_proposals_type"
      ON "governance_proposals" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_governance_proposals_type"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_governance_proposals_createdByUserId"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "proposalThreshold"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "quorumBps"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "requiredQuorum"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "attachments"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "action"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "type"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "createdByUserId"
    `);
  }
}
