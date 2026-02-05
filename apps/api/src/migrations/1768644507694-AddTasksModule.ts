import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddTasksModule1768644507694 implements MigrationInterface {
  name = 'AddTasksModule1768644507694';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_modules_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_modules_category"`);
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_priority_enum" AS ENUM('urgent', 'high', 'medium', 'low', 'none')`
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "dueDate" date, "startDate" date, "estimatedMinutes" integer, "storyPoints" smallint, "acceptanceCriteria" jsonb, "sortOrder" integer NOT NULL DEFAULT '0', "companyId" uuid NOT NULL, "clientId" uuid, "assigneeId" uuid, "createdById" uuid NOT NULL, "parentTaskId" uuid, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b845a1166502a1f9ee0969909" ON "tasks" ("companyId", "isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99bfa7a6c5aaca173a6e1ac518" ON "tasks" ("companyId", "parentTaskId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_62dc2e225697b27d7977b0628d" ON "tasks" ("companyId", "priority") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35a9e17513f948604f159200e8" ON "tasks" ("companyId", "sortOrder") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21a27750732cb594800c39bb26" ON "tasks" ("companyId", "dueDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2f457b10329c90b0aefcc69a9" ON "tasks" ("companyId", "clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b6fa36b8d6309a371ec9c4b3db" ON "tasks" ("companyId", "assigneeId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24927e51f485d7ad12fcbfd93e" ON "tasks" ("companyId", "status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_683ad3f76f2544e5115afec26d" ON "tasks" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TABLE "task_labels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "color" character varying(7) NOT NULL DEFAULT '#6366f1', "description" text, "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_72402f2c22ceabc2e73b718c321" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4b0c8537af524732c743b65c0a" ON "task_labels" ("companyId", "name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3278c2bc576fa2929295a45306" ON "task_labels" ("companyId") `
    );
    await queryRunner.query(
      `CREATE TABLE "task_label_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "taskId" uuid NOT NULL, "labelId" uuid NOT NULL, "assignedById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_41eea57a8d486e201a364a183b9" UNIQUE ("taskId", "labelId"), CONSTRAINT "PK_abea4da017c176df05fda3187fa" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bcd0dab201bbcb97ff0f341dd1" ON "task_label_assignments" ("labelId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_132210971f5f0117d0c72db92c" ON "task_label_assignments" ("taskId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."task_dependencies_dependencytype_enum" AS ENUM('blocks', 'blocked_by', 'relates_to')`
    );
    await queryRunner.query(
      `CREATE TABLE "task_dependencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "taskId" uuid NOT NULL, "dependsOnTaskId" uuid NOT NULL, "dependencyType" "public"."task_dependencies_dependencytype_enum" NOT NULL DEFAULT 'blocked_by', "createdById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ff11847da61cdd7f74e0f832ac0" UNIQUE ("taskId", "dependsOnTaskId"), CONSTRAINT "PK_e31de0e173af595a21c4ec8e48b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e94ede407a522714514c8471a8" ON "task_dependencies" ("dependsOnTaskId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70371fdc2193845ef4feb9fb87" ON "task_dependencies" ("taskId") `
    );
    await queryRunner.query(
      `CREATE TABLE "task_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "taskId" uuid NOT NULL, "authorId" uuid NOT NULL, "isEdited" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a2203f600be90963a165d1432" ON "task_comments" ("taskId", "createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba265816ca1d93f51083e06c52" ON "task_comments" ("taskId") `
    );
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "notificationFromEmail"`);
    await queryRunner.query(
      `ALTER TYPE "public"."module_source_enum" RENAME TO "module_source_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."modules_source_enum" AS ENUM('file', 'database', 'legacy')`
    );
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "source" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "modules" ALTER COLUMN "source" TYPE "public"."modules_source_enum" USING "source"::"text"::"public"."modules_source_enum"`
    );
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "source" SET DEFAULT 'legacy'`);
    await queryRunner.query(`DROP TYPE "public"."module_source_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_683ad3f76f2544e5115afec26d2" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_4e7cd3aff0dbd7708e02b14ecb8" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_660898d912c6e71107e9ef8f38d" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_34701b0b8d466af308ba202e4ef" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_labels" ADD CONSTRAINT "FK_3278c2bc576fa2929295a453064" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_labels" ADD CONSTRAINT "FK_d8a5323ba3609b3464c0a3a5919" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" ADD CONSTRAINT "FK_132210971f5f0117d0c72db92c4" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" ADD CONSTRAINT "FK_bcd0dab201bbcb97ff0f341dd1a" FOREIGN KEY ("labelId") REFERENCES "task_labels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" ADD CONSTRAINT "FK_00fc112cf2e549b1aa09e9c2e74" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_70371fdc2193845ef4feb9fb879" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_e94ede407a522714514c8471a81" FOREIGN KEY ("dependsOnTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_b597fefabfc03d5a6bf34330fa9" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba265816ca1d93f51083e06c520" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_a57898470720b4fa4fa5064b501" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_comments" DROP CONSTRAINT "FK_a57898470720b4fa4fa5064b501"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_comments" DROP CONSTRAINT "FK_ba265816ca1d93f51083e06c520"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_b597fefabfc03d5a6bf34330fa9"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_e94ede407a522714514c8471a81"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_70371fdc2193845ef4feb9fb879"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" DROP CONSTRAINT "FK_00fc112cf2e549b1aa09e9c2e74"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" DROP CONSTRAINT "FK_bcd0dab201bbcb97ff0f341dd1a"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_label_assignments" DROP CONSTRAINT "FK_132210971f5f0117d0c72db92c4"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_labels" DROP CONSTRAINT "FK_d8a5323ba3609b3464c0a3a5919"`
    );
    await queryRunner.query(
      `ALTER TABLE "task_labels" DROP CONSTRAINT "FK_3278c2bc576fa2929295a453064"`
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_34701b0b8d466af308ba202e4ef"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_660898d912c6e71107e9ef8f38d"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_9a16d2c86252529f622fa53f1e3"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_4e7cd3aff0dbd7708e02b14ecb8"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_683ad3f76f2544e5115afec26d2"`);
    await queryRunner.query(
      `CREATE TYPE "public"."module_source_enum_old" AS ENUM('file', 'database', 'legacy')`
    );
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "source" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "modules" ALTER COLUMN "source" TYPE "public"."module_source_enum_old" USING "source"::"text"::"public"."module_source_enum_old"`
    );
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "source" SET DEFAULT 'legacy'`);
    await queryRunner.query(`DROP TYPE "public"."modules_source_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."module_source_enum_old" RENAME TO "module_source_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "notificationFromEmail" character varying`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ba265816ca1d93f51083e06c52"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0a2203f600be90963a165d1432"`);
    await queryRunner.query(`DROP TABLE "task_comments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_70371fdc2193845ef4feb9fb87"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e94ede407a522714514c8471a8"`);
    await queryRunner.query(`DROP TABLE "task_dependencies"`);
    await queryRunner.query(`DROP TYPE "public"."task_dependencies_dependencytype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_132210971f5f0117d0c72db92c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bcd0dab201bbcb97ff0f341dd1"`);
    await queryRunner.query(`DROP TABLE "task_label_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3278c2bc576fa2929295a45306"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4b0c8537af524732c743b65c0a"`);
    await queryRunner.query(`DROP TABLE "task_labels"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_683ad3f76f2544e5115afec26d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_24927e51f485d7ad12fcbfd93e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b6fa36b8d6309a371ec9c4b3db"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b2f457b10329c90b0aefcc69a9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_21a27750732cb594800c39bb26"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_35a9e17513f948604f159200e8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_62dc2e225697b27d7977b0628d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_99bfa7a6c5aaca173a6e1ac518"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1b845a1166502a1f9ee0969909"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    await queryRunner.query(`CREATE INDEX "IDX_modules_category" ON "modules" ("category") `);
    await queryRunner.query(`CREATE INDEX "IDX_modules_source" ON "modules" ("source") `);
  }
}
