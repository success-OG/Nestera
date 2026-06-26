import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGovernanceProposalTemplates1800100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "templateId" varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "templateVersion" varchar(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      ADD COLUMN IF NOT EXISTS "templateParameters" jsonb
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_proposals_templateId"
      ON "governance_proposals" ("templateId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_governance_proposals_templateVersion"
      ON "governance_proposals" ("templateVersion")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_governance_proposals_templateVersion"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_governance_proposals_templateId"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "templateParameters"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "templateVersion"
    `);
    await queryRunner.query(`
      ALTER TABLE "governance_proposals"
      DROP COLUMN IF EXISTS "templateId"
    `);
  }
}
