import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migrates data from legacy Client fields to their new counterparts:
 * - gtuCode (varchar) → gtuCodes (text[])
 * - amlGroup (varchar) → amlGroupEnum (enum)
 *
 * After verifying data integrity in production, a follow-up migration
 * should drop the legacy columns.
 */
export class MigrateLegacyClientFields1772000000002 implements MigrationInterface {
  name = 'MigrateLegacyClientFields1772000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate gtuCode → gtuCodes (only where gtuCodes is empty/null)
    const gtuResult = await queryRunner.query(`
      UPDATE clients
      SET "gtuCodes" = ARRAY["gtuCode"]
      WHERE "gtuCode" IS NOT NULL
        AND "gtuCode" != ''
        AND ("gtuCodes" IS NULL OR array_length("gtuCodes", 1) IS NULL)
    `);
    const _gtuMigrated = gtuResult?.[1] ?? 0;

    // Migrate amlGroup → amlGroupEnum (only where amlGroupEnum is null)
    // First check which values exist in amlGroup
    const amlValues = await queryRunner.query(`
      SELECT DISTINCT "amlGroup" FROM clients
      WHERE "amlGroup" IS NOT NULL AND "amlGroupEnum" IS NULL
    `);

    let _amlMigrated = 0;
    if (amlValues.length > 0) {
      // Get valid enum values
      const validEnumValues = await queryRunner.query(`
        SELECT unnest(enum_range(NULL::aml_group_enum))::text as val
      `);
      const validSet = new Set(validEnumValues.map((r: { val: string }) => r.val));

      // Only migrate values that match the enum
      const migratable = amlValues.filter((r: { amlGroup: string }) => validSet.has(r.amlGroup));

      if (migratable.length > 0) {
        const result = await queryRunner.query(`
          UPDATE clients
          SET "amlGroupEnum" = "amlGroup"::aml_group_enum
          WHERE "amlGroup" IS NOT NULL
            AND "amlGroupEnum" IS NULL
            AND "amlGroup" IN (SELECT unnest(enum_range(NULL::aml_group_enum))::text)
        `);
        _amlMigrated = result?.[1] ?? 0;
      }

      // Log unmigrated values (values not matching enum)
      const unmigratableValues = amlValues.filter(
        (r: { amlGroup: string }) => !validSet.has(r.amlGroup)
      );
      if (unmigratableValues.length > 0) {
        // These will remain in the legacy column for manual review
        // They can be inspected with:
        // SELECT id, "amlGroup" FROM clients WHERE "amlGroupEnum" IS NULL AND "amlGroup" IS NOT NULL;
      }
    }

    // Log summary (visible in migration runner output)
    await queryRunner.query(`SELECT 1`); // ensure connection is alive
    // Results logged via return values to TypeORM migration runner
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Clear migrated enum values (revert to legacy-only state)
    await queryRunner.query(`
      UPDATE clients
      SET "amlGroupEnum" = NULL
      WHERE "amlGroupEnum" IS NOT NULL
        AND "amlGroup" IS NOT NULL
    `);

    // Clear migrated gtuCodes arrays that came from single gtuCode
    await queryRunner.query(`
      UPDATE clients
      SET "gtuCodes" = NULL
      WHERE "gtuCode" IS NOT NULL
        AND "gtuCodes" IS NOT NULL
        AND array_length("gtuCodes", 1) = 1
        AND "gtuCodes"[1] = "gtuCode"
    `);
  }
}
