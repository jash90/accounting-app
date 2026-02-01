import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddDefaultZusSettings1769946801688 implements MigrationInterface {
  name = 'AddDefaultZusSettings1769946801688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert default ZUS settings for all active clients without settings
    // Maps ZusStatus from client to ZusDiscountType for settings:
    // - FULL -> NONE (no discount)
    // - PREFERENTIAL -> SMALL_ZUS (preferencyjny ZUS)
    // - NONE -> STARTUP_RELIEF (ulga na start - no ZUS contributions)
    await queryRunner.query(`
      INSERT INTO zus_client_settings (
        id,
        "companyId",
        "clientId",
        "discountType",
        "healthContributionType",
        "sicknessInsuranceOptIn",
        "paymentDay",
        "accidentRate",
        "isActive",
        "createdById",
        "createdAt",
        "updatedAt"
      )
      SELECT
        uuid_generate_v4(),
        c."companyId",
        c.id,
        CASE
          WHEN c."zusStatus" = 'PREFERENTIAL' THEN 'SMALL_ZUS'
          WHEN c."zusStatus" = 'NONE' THEN 'STARTUP_RELIEF'
          ELSE 'NONE'
        END::"public"."zus_client_settings_discounttype_enum",
        'SCALE'::"public"."zus_client_settings_healthcontributiontype_enum",
        false,
        15,
        0.0167,
        true,
        c."createdById",
        NOW(),
        NOW()
      FROM clients c
      WHERE c."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM zus_client_settings zcs
          WHERE zcs."clientId" = c.id
        )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration adds data, not schema changes.
    // Reverting would delete settings which could cause data loss.
    // If needed, manually identify and delete auto-generated settings.
    console.log(
      'AddDefaultZusSettings1769946801688: down() - no automatic revert to prevent data loss'
    );
  }
}
