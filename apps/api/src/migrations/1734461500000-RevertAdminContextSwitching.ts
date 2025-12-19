import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class RevertAdminContextSwitching1734461500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    const usersTable = await queryRunner.getTable("users");
    const foreignKey = usersTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("activeCompanyId") !== -1
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey("users", foreignKey);
    }

    // Drop activeCompanyId column from users
    await queryRunner.dropColumn("users", "activeCompanyId");

    // Drop isTestCompany column from companies
    await queryRunner.dropColumn("companies", "isTestCompany");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add activeCompanyId column to users
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "activeCompanyId",
        type: "uuid",
        isNullable: true,
      })
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        columnNames: ["activeCompanyId"],
        referencedColumnNames: ["id"],
        referencedTableName: "companies",
        onDelete: "SET NULL",
      })
    );

    // Re-add isTestCompany column to companies
    await queryRunner.addColumn(
      "companies",
      new TableColumn({
        name: "isTestCompany",
        type: "boolean",
        default: false,
      })
    );
  }
}
