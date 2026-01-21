import { type MigrationInterface, type QueryRunner, TableForeignKey } from 'typeorm';

interface FKMetadata {
  name: string;
  columnNames: string[];
  referencedTableName: string;
  referencedColumnNames: string[];
  onDelete?: string;
  onUpdate?: string;
}

export class AddDatabaseIndexes1766478546257 implements MigrationInterface {
  name = 'AddDatabaseIndexes1766478546257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dynamically capture FK metadata before dropping
    const companiesTable = await queryRunner.getTable('companies');
    const usersTable = await queryRunner.getTable('users');

    // Find FKs by column name (more reliable than hardcoded names)
    const companiesOwnerFK = companiesTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('ownerId')
    );
    const usersCompanyFK = usersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('companyId')
    );

    // Store FK metadata for restoration
    const companiesOwnerFKMetadata: FKMetadata | null = companiesOwnerFK
      ? {
          name: companiesOwnerFK.name,
          columnNames: companiesOwnerFK.columnNames,
          referencedTableName: companiesOwnerFK.referencedTableName,
          referencedColumnNames: companiesOwnerFK.referencedColumnNames,
          onDelete: companiesOwnerFK.onDelete,
          onUpdate: companiesOwnerFK.onUpdate,
        }
      : null;

    const usersCompanyFKMetadata: FKMetadata | null = usersCompanyFK
      ? {
          name: usersCompanyFK.name,
          columnNames: usersCompanyFK.columnNames,
          referencedTableName: usersCompanyFK.referencedTableName,
          referencedColumnNames: usersCompanyFK.referencedColumnNames,
          onDelete: usersCompanyFK.onDelete,
          onUpdate: usersCompanyFK.onUpdate,
        }
      : null;

    // Drop FK constraints if they exist
    if (companiesOwnerFK) {
      await queryRunner.dropForeignKey('companies', companiesOwnerFK);
    }
    if (usersCompanyFK) {
      await queryRunner.dropForeignKey('users', usersCompanyFK);
    }

    // Create performance indexes (using public schema for consistency with down migration)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b48860677afe62cd96e1265948" ON "public"."clients" ("email") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0f760a14ed395d73bbbe688764" ON "public"."clients" ("zusStatus") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_62c34340705568e5b02222d4f2" ON "public"."clients" ("taxScheme") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_72732477bbddafce14380fd91d" ON "public"."clients" ("vatStatus") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dad21d0dbcd0c984f479599f39" ON "public"."clients" ("employmentType") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_11858a8861bfe7496d663ffd05" ON "public"."clients" ("companyId", "name") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_21aa72858a258ab9a71969c7bf" ON "public"."clients" ("companyId", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_605e81319be9823d9666a1b43e" ON "public"."companies" ("isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a58fba747b0d4bc3fdfa6ad250" ON "public"."companies" ("isSystemCompany") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6dcdcbb7d72f64602307ec4ab3" ON "public"."companies" ("ownerId") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ace513fa30d485cfd25c11a9e4" ON "public"."users" ("role") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ce9dccc3162cbe075e0ab77108" ON "public"."users" ("companyId", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6f9395c9037632a31107c8a9e5" ON "public"."users" ("companyId") `
    );

    // Restore FK constraints with their original ON DELETE/ON UPDATE rules
    if (usersCompanyFKMetadata) {
      await queryRunner.createForeignKey(
        'users',
        new TableForeignKey({
          name: usersCompanyFKMetadata.name,
          columnNames: usersCompanyFKMetadata.columnNames,
          referencedTableName: usersCompanyFKMetadata.referencedTableName,
          referencedColumnNames: usersCompanyFKMetadata.referencedColumnNames,
          onDelete: usersCompanyFKMetadata.onDelete,
          onUpdate: usersCompanyFKMetadata.onUpdate,
        })
      );
    }
    if (companiesOwnerFKMetadata) {
      await queryRunner.createForeignKey(
        'companies',
        new TableForeignKey({
          name: companiesOwnerFKMetadata.name,
          columnNames: companiesOwnerFKMetadata.columnNames,
          referencedTableName: companiesOwnerFKMetadata.referencedTableName,
          referencedColumnNames: companiesOwnerFKMetadata.referencedColumnNames,
          onDelete: companiesOwnerFKMetadata.onDelete,
          onUpdate: companiesOwnerFKMetadata.onUpdate,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes using IF EXISTS for idempotency
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6f9395c9037632a31107c8a9e5"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ce9dccc3162cbe075e0ab77108"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6dcdcbb7d72f64602307ec4ab3"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_a58fba747b0d4bc3fdfa6ad250"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_605e81319be9823d9666a1b43e"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_21aa72858a258ab9a71969c7bf"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_11858a8861bfe7496d663ffd05"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_dad21d0dbcd0c984f479599f39"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_72732477bbddafce14380fd91d"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_62c34340705568e5b02222d4f2"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_0f760a14ed395d73bbbe688764"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_b48860677afe62cd96e1265948"`);
    // FK constraints are not touched - they exist both before and after this migration
  }
}
