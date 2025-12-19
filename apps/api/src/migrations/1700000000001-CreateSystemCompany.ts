import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemCompany1700000000001 implements MigrationInterface {
  name = 'CreateSystemCompany1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting System Admin Company creation...');

    // Step 1: Add isSystemCompany column to companies table (if it doesn't exist)
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='companies'
      AND column_name='isSystemCompany'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "companies"
        ADD COLUMN "isSystemCompany" boolean NOT NULL DEFAULT false
      `);
      console.log('✓ Added isSystemCompany column');
    } else {
      console.log('✓ isSystemCompany column already exists, skipping');
    }

    // Step 2: Find an active ADMIN user to be owner
    const adminUsers = await queryRunner.query(`
      SELECT id FROM "users"
      WHERE role = 'ADMIN'
      AND "isActive" = true
      LIMIT 1
    `);

    if (adminUsers.length === 0) {
      console.log('ℹ️ No ADMIN user found - skipping data migration.');
      console.log('ℹ️ System Admin company will be created by seeder.');
      console.log('✅ Schema changes (isSystemCompany column) applied successfully.');
      return; // Exit early, schema changes already applied
    }

    const adminUserId = adminUsers[0].id;
    console.log(`✓ Found admin user: ${adminUserId}`);

    // Step 3: Check if System Admin company already exists
    const existingSystemCompany = await queryRunner.query(`
      SELECT id FROM "companies"
      WHERE name = 'System Admin'
    `);

    let systemCompanyId: string;

    if (existingSystemCompany.length > 0) {
      // Update existing company to be system company
      systemCompanyId = existingSystemCompany[0].id;
      await queryRunner.query(`
        UPDATE "companies"
        SET "isSystemCompany" = true,
            "ownerId" = $1,
            "isActive" = true
        WHERE id = $2
      `, [adminUserId, systemCompanyId]);
      console.log(`✓ Updated existing company to System Admin: ${systemCompanyId}`);
    } else {
      // Create new System Admin company
      const result = await queryRunner.query(`
        INSERT INTO "companies" (id, name, "ownerId", "isActive", "isSystemCompany", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'System Admin', $1, true, true, NOW(), NOW())
        RETURNING id
      `, [adminUserId]);
      systemCompanyId = result[0].id;
      console.log(`✓ Created System Admin company: ${systemCompanyId}`);
    }

    // Step 4: Update all ADMIN users to have this companyId
    const updatedAdmins = await queryRunner.query(`
      UPDATE "users"
      SET "companyId" = $1
      WHERE role = 'ADMIN'
      AND ("companyId" IS NULL OR "companyId" != $1)
      RETURNING id
    `, [systemCompanyId]);
    console.log(`✓ Assigned ${updatedAdmins.length} admin users to System Admin company`);

    // Step 5: Update all SimpleText entries with NULL companyId to system company
    const updatedTexts = await queryRunner.query(`
      UPDATE "simple_texts"
      SET "companyId" = $1
      WHERE "companyId" IS NULL
      RETURNING id
    `, [systemCompanyId]);
    console.log(`✓ Migrated ${updatedTexts.length} admin SimpleText entries to System Admin company`);

    // Step 6: Create company_module_access entries for system company
    const modules = await queryRunner.query(`
      SELECT id, slug FROM "modules" WHERE "isActive" = true
    `);

    let accessCount = 0;
    for (const module of modules) {
      // Check if access already exists
      const existingAccess = await queryRunner.query(`
        SELECT id FROM "company_module_access"
        WHERE "companyId" = $1 AND "moduleId" = $2
      `, [systemCompanyId, module.id]);

      if (existingAccess.length === 0) {
        await queryRunner.query(`
          INSERT INTO "company_module_access" ("companyId", "moduleId", "isEnabled", "createdAt")
          VALUES ($1, $2, true, NOW())
        `, [systemCompanyId, module.id]);
        accessCount++;
      }
    }
    console.log(`✓ Created ${accessCount} module access records for System Admin company`);

    // Step 7: Make companyId NOT NULL in simple_texts for data integrity
    await queryRunner.query(`
      ALTER TABLE "simple_texts"
      ALTER COLUMN "companyId" SET NOT NULL
    `);
    console.log('✓ Enforced NOT NULL constraint on simple_texts.companyId');

    console.log('✅ System Admin Company migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting System Admin Company rollback...');

    // Step 1: Find system company
    const systemCompany = await queryRunner.query(`
      SELECT id FROM "companies"
      WHERE "isSystemCompany" = true
      LIMIT 1
    `);

    if (systemCompany.length === 0) {
      console.log('No system company found, skipping rollback');
      return;
    }

    const systemCompanyId = systemCompany[0].id;
    console.log(`Found system company: ${systemCompanyId}`);

    // Step 2: Allow NULL in simple_texts
    await queryRunner.query(`
      ALTER TABLE "simple_texts"
      ALTER COLUMN "companyId" DROP NOT NULL
    `);
    console.log('✓ Removed NOT NULL constraint from simple_texts.companyId');

    // Step 3: Set SimpleText entries back to NULL
    const updatedTexts = await queryRunner.query(`
      UPDATE "simple_texts"
      SET "companyId" = NULL
      WHERE "companyId" = $1
      RETURNING id
    `, [systemCompanyId]);
    console.log(`✓ Reverted ${updatedTexts.length} SimpleText entries to NULL companyId`);

    // Step 4: Set ADMIN users back to NULL companyId
    const updatedUsers = await queryRunner.query(`
      UPDATE "users"
      SET "companyId" = NULL
      WHERE role = 'ADMIN' AND "companyId" = $1
      RETURNING id
    `, [systemCompanyId]);
    console.log(`✓ Reset ${updatedUsers.length} admin users to NULL companyId`);

    // Step 5: Delete company_module_access entries for system company
    const deletedAccess = await queryRunner.query(`
      DELETE FROM "company_module_access"
      WHERE "companyId" = $1
      RETURNING id
    `, [systemCompanyId]);
    console.log(`✓ Removed ${deletedAccess.length} module access records`);

    // Step 6: Remove isSystemCompany column
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN "isSystemCompany"
    `);
    console.log('✓ Removed isSystemCompany column');

    // Note: We don't delete the system company itself to preserve history
    console.log('✅ System Admin Company rollback completed successfully!');
    console.log('ℹ️  System Admin company preserved for historical records');
  }
}
