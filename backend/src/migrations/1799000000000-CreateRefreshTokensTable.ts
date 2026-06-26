import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1799000000000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "token" varchar(255) NOT NULL,
        "deviceId" varchar(64) NOT NULL,
        "deviceName" varchar(255),
        "ipAddress" varchar(45),
        "userAgent" varchar(500),
        "isRevoked" boolean DEFAULT false,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens"("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_token" ON "refresh_tokens"("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_expiresAt" ON "refresh_tokens"("expiresAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_isRevoked" ON "refresh_tokens"("isRevoked")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
