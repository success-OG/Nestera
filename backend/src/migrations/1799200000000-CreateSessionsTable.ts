import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1799200000000 implements MigrationInterface {
  name = 'CreateSessionsTable1799200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "jti" varchar(64) NOT NULL UNIQUE,
        "deviceId" varchar(255),
        "deviceName" varchar(255),
        "ipAddress" varchar(45),
        "userAgent" varchar(500),
        "isRevoked" boolean DEFAULT false,
        "expiresAt" timestamp NOT NULL,
        "lastAccessedAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_userId" ON "sessions"("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_jti" ON "sessions"("jti")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_isRevoked" ON "sessions"("isRevoked")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sessions_expiresAt" ON "sessions"("expiresAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
