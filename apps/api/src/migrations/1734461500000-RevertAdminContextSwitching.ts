import { TableColumn, TableForeignKey, type MigrationInterface, type QueryRunner } from 'typeorm';

export class RevertAdminContextSwitching1734461500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and drop activeCompanyId from users (idempotent)
    const hasActiveCompanyId = await queryRunner.hasColumn('users', 'activeCompanyId');
    if (hasActiveCompanyId) {
      // Drop foreign key constraint first
      const usersTable = await queryRunner.getTable('users');
      const foreignKey = usersTable?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('activeCompanyId') !== -1
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('users', foreignKey);
      }
      await queryRunner.dropColumn('users', 'activeCompanyId');
    }

    // Check and drop isTestCompany from companies (idempotent)
    const hasIsTestCompany = await queryRunner.hasColumn('companies', 'isTestCompany');
    if (hasIsTestCompany) {
      await queryRunner.dropColumn('companies', 'isTestCompany');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add activeCompanyId column to users (idempotent)
    const hasActiveCompanyId = await queryRunner.hasColumn('users', 'activeCompanyId');
    if (!hasActiveCompanyId) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'activeCompanyId',
          type: 'uuid',
          isNullable: true,
        })
      );

      // Add foreign key constraint only if column was just added
      await queryRunner.createForeignKey(
        'users',
        new TableForeignKey({
          columnNames: ['activeCompanyId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'companies',
          onDelete: 'SET NULL',
        })
      );
    }

    // Re-add isTestCompany column to companies (idempotent)
    const hasIsTestCompany = await queryRunner.hasColumn('companies', 'isTestCompany');
    if (!hasIsTestCompany) {
      await queryRunner.addColumn(
        'companies',
        new TableColumn({
          name: 'isTestCompany',
          type: 'boolean',
          default: false,
        })
      );
    }
  }
}
