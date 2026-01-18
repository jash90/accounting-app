import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientDeleteRequests1765738488027 implements MigrationInterface {
    name = 'AddClientDeleteRequests1765738488027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."client_delete_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "client_delete_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "companyId" uuid NOT NULL, "requestedById" uuid NOT NULL, "status" "public"."client_delete_requests_status_enum" NOT NULL DEFAULT 'PENDING', "reason" text, "processedById" uuid, "rejectionReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "processedAt" TIMESTAMP, CONSTRAINT "PK_4e20b8af822972ca57e05d1cb87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3e6cc48f6169f54d8411bdaec1" ON "client_delete_requests" ("clientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_353a3b5c06fbb0d6dc02b575c3" ON "client_delete_requests" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_04d38f5174fad44214251dae58" ON "client_delete_requests" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" ADD CONSTRAINT "FK_3e6cc48f6169f54d8411bdaec13" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" ADD CONSTRAINT "FK_04d38f5174fad44214251dae58a" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" ADD CONSTRAINT "FK_7e8026b656289ff264f43f7bb7f" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" ADD CONSTRAINT "FK_5c7dce8bec2b3ab5860c122699f" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_delete_requests" DROP CONSTRAINT "FK_5c7dce8bec2b3ab5860c122699f"`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" DROP CONSTRAINT "FK_7e8026b656289ff264f43f7bb7f"`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" DROP CONSTRAINT "FK_04d38f5174fad44214251dae58a"`);
        await queryRunner.query(`ALTER TABLE "client_delete_requests" DROP CONSTRAINT "FK_3e6cc48f6169f54d8411bdaec13"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04d38f5174fad44214251dae58"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_353a3b5c06fbb0d6dc02b575c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e6cc48f6169f54d8411bdaec1"`);
        await queryRunner.query(`DROP TABLE "client_delete_requests"`);
        await queryRunner.query(`DROP TYPE "public"."client_delete_requests_status_enum"`);
    }

}
