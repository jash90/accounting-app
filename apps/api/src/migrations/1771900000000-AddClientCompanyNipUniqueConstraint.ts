import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddClientCompanyNipUniqueConstraint1771900000000 implements MigrationInterface {
  name = 'AddClientCompanyNipUniqueConstraint1771900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_clients_companyId_nip" ON "clients" ("companyId", "nip") WHERE "nip" IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_clients_companyId_nip"`);
  }
}
