import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddNotificationModule1769101923468 implements MigrationInterface {
  name = 'AddNotificationModule1769101923468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "recipientId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "type" character varying(100) NOT NULL,
        "moduleSlug" character varying(100) NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text,
        "data" jsonb,
        "actionUrl" character varying(500),
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "isArchived" boolean NOT NULL DEFAULT false,
        "archivedAt" TIMESTAMP,
        "emailSent" boolean NOT NULL DEFAULT false,
        "emailSentAt" TIMESTAMP,
        "actorId" uuid,
        "isBatch" boolean NOT NULL DEFAULT false,
        "itemCount" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_moduleSlug" ON "notifications" ("moduleSlug")`
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_companyId" ON "notifications" ("companyId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_createdAt" ON "notifications" ("recipientId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_read_archived" ON "notifications" ("recipientId", "isRead", "isArchived")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_actorId" ON "notifications" ("actorId")`
    );

    await queryRunner.query(
      `ALTER TABLE "notification_settings" ADD COLUMN IF NOT EXISTS "inAppEnabled" boolean NOT NULL DEFAULT true`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" ADD COLUMN IF NOT EXISTS "emailEnabled" boolean NOT NULL DEFAULT true`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" ADD COLUMN IF NOT EXISTS "typePreferences" jsonb`
    );

    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_recipient"
      FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_company"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_actor"
      FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_actor"`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_company"`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_recipient"`
    );

    await queryRunner.query(
      `ALTER TABLE "notification_settings" DROP COLUMN IF EXISTS "typePreferences"`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" DROP COLUMN IF EXISTS "emailEnabled"`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" DROP COLUMN IF EXISTS "inAppEnabled"`
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_actorId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_recipient_read_archived"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_recipient_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_companyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_moduleSlug"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
