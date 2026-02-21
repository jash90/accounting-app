import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddOffersModule1769878205493 implements MigrationInterface {
  name = 'AddOffersModule1769878205493';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(
      `CREATE TYPE "public"."leads_status_enum" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leads_source_enum" AS ENUM('WEBSITE', 'REFERRAL', 'PHONE', 'EMAIL', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'OTHER')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."offers_status_enum" AS ENUM('DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."offer_activities_activitytype_enum" AS ENUM('CREATED', 'UPDATED', 'STATUS_CHANGED', 'DOCUMENT_GENERATED', 'EMAIL_SENT', 'VIEWED', 'DUPLICATED', 'COMMENT_ADDED')`
    );

    // Create leads table
    await queryRunner.query(
      `CREATE TABLE "leads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "nip" character varying(10), "regon" character varying(14), "street" character varying(255), "postalCode" character varying(10), "city" character varying(100), "country" character varying(100) DEFAULT 'Polska', "contactPerson" character varying(255), "contactPosition" character varying(100), "email" character varying(255), "phone" character varying(50), "status" "public"."leads_status_enum" NOT NULL DEFAULT 'NEW', "source" "public"."leads_source_enum", "notes" text, "estimatedValue" numeric(15,2), "assignedToId" uuid, "convertedToClientId" uuid, "convertedAt" TIMESTAMP, "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_b3eea7add0e16594dba102716c" ON "leads" ("email") `);
    await queryRunner.query(`CREATE INDEX "IDX_4ad4cd6f286a59dc50ec96e485" ON "leads" ("nip") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_2fedf4139199486f08e21ff0b3" ON "leads" ("companyId", "status") `
    );
    await queryRunner.query(`CREATE INDEX "IDX_b65118404b3b0f8898ddf0c9ee" ON "leads" ("source") `);
    await queryRunner.query(`CREATE INDEX "IDX_491b018d616822bd64ce7d4726" ON "leads" ("status") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_b27f38bac494d6a2a8d899e3ca" ON "leads" ("companyId") `
    );

    // Create offer_templates table
    await queryRunner.query(
      `CREATE TABLE "offer_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "templateFilePath" character varying(500), "templateFileName" character varying(255), "availablePlaceholders" jsonb, "defaultServiceItems" jsonb, "defaultValidityDays" integer NOT NULL DEFAULT '30', "defaultVatRate" numeric(5,2) NOT NULL DEFAULT '23', "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7882188b5dcc8822cfe7a00df09" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_00565804217b27a7e2a4ace362" ON "offer_templates" ("companyId", "isDefault") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd9a153d5c274335570d0e91dc" ON "offer_templates" ("isDefault") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc06517d6c23b6580ef12a2645" ON "offer_templates" ("companyId") `
    );

    // Create offers table
    await queryRunner.query(
      `CREATE TABLE "offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "offerNumber" character varying(50) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "status" "public"."offers_status_enum" NOT NULL DEFAULT 'DRAFT', "clientId" uuid, "leadId" uuid, "recipientSnapshot" jsonb NOT NULL, "templateId" uuid, "totalNetAmount" numeric(15,2) NOT NULL DEFAULT '0', "vatRate" numeric(5,2) NOT NULL DEFAULT '23', "totalGrossAmount" numeric(15,2) NOT NULL DEFAULT '0', "serviceTerms" jsonb, "customPlaceholders" jsonb, "offerDate" date NOT NULL, "validUntil" date NOT NULL, "generatedDocumentPath" character varying(500), "generatedDocumentName" character varying(255), "sentAt" TIMESTAMP, "sentToEmail" character varying(255), "sentById" uuid, "emailSubject" text, "emailBody" text, "companyId" uuid NOT NULL, "createdById" uuid NOT NULL, "updatedById" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_35e302c723589bd6d3400750aa8" UNIQUE ("offerNumber"), CONSTRAINT "PK_4c88e956195bba85977da21b8f4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c5cbc1721532c31fc1a245433" ON "offers" ("validUntil") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bfc970e1273291290659c9e03" ON "offers" ("offerDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce1c20a7ea3b20350346f27d6e" ON "offers" ("leadId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c9f489dd21fc4a1cc57388e72" ON "offers" ("clientId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b61050145eac90a452ac93c7d" ON "offers" ("companyId", "status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35e302c723589bd6d3400750aa" ON "offers" ("offerNumber") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_434239966cb60e2dbc6178f993" ON "offers" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_49aeaf4d165a214b570147e891" ON "offers" ("companyId") `
    );

    // Create offer_activities table
    await queryRunner.query(
      `CREATE TABLE "offer_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "offerId" uuid NOT NULL, "activityType" "public"."offer_activities_activitytype_enum" NOT NULL, "description" text, "metadata" jsonb, "companyId" uuid NOT NULL, "performedById" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c66b5951164d433e512c4fe70f6" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5e0d753a443fb3a8543d875f3" ON "offer_activities" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c20c085cb673576c0c53ee9dd2" ON "offer_activities" ("activityType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9188f5d3fd0f93eec87043f7e" ON "offer_activities" ("companyId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e8fdea487cf6e875e430b225a" ON "offer_activities" ("offerId") `
    );

    // Add foreign keys for leads
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_533da3a3887638192a5dfa2c176" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_b27f38bac494d6a2a8d899e3caf" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_6fb5366e90bc6455ebf2f749d65" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "FK_87219604e711425455fc71001d0" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // Add foreign keys for offer_templates
    await queryRunner.query(
      `ALTER TABLE "offer_templates" ADD CONSTRAINT "FK_fc06517d6c23b6580ef12a26456" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_templates" ADD CONSTRAINT "FK_b550a7520b4f7a71fdf23445272" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_templates" ADD CONSTRAINT "FK_42428723b5e39bce1bfe915733d" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // Add foreign keys for offers
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_3c9f489dd21fc4a1cc57388e72c" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_ce1c20a7ea3b20350346f27d6e2" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_655ee59e15ffc64d43c4c087cb5" FOREIGN KEY ("templateId") REFERENCES "offer_templates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_5e2f99c19e6e582e48899c9fdd4" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_49aeaf4d165a214b570147e8914" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_85a7620d737fa59f750f8abe52f" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" ADD CONSTRAINT "FK_5c357e5dde1eb6c8f2d70f92bea" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // Add foreign keys for offer_activities
    await queryRunner.query(
      `ALTER TABLE "offer_activities" ADD CONSTRAINT "FK_1e8fdea487cf6e875e430b225a3" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activities" ADD CONSTRAINT "FK_e9188f5d3fd0f93eec87043f7e9" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activities" ADD CONSTRAINT "FK_76012b86f363585ca399e9a4df3" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys for offer_activities
    await queryRunner.query(
      `ALTER TABLE "offer_activities" DROP CONSTRAINT "FK_76012b86f363585ca399e9a4df3"`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activities" DROP CONSTRAINT "FK_e9188f5d3fd0f93eec87043f7e9"`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_activities" DROP CONSTRAINT "FK_1e8fdea487cf6e875e430b225a3"`
    );

    // Drop foreign keys for offers
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_5c357e5dde1eb6c8f2d70f92bea"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_85a7620d737fa59f750f8abe52f"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_49aeaf4d165a214b570147e8914"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_5e2f99c19e6e582e48899c9fdd4"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_655ee59e15ffc64d43c4c087cb5"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_ce1c20a7ea3b20350346f27d6e2"`
    );
    await queryRunner.query(
      `ALTER TABLE "offers" DROP CONSTRAINT "FK_3c9f489dd21fc4a1cc57388e72c"`
    );

    // Drop foreign keys for offer_templates
    await queryRunner.query(
      `ALTER TABLE "offer_templates" DROP CONSTRAINT "FK_42428723b5e39bce1bfe915733d"`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_templates" DROP CONSTRAINT "FK_b550a7520b4f7a71fdf23445272"`
    );
    await queryRunner.query(
      `ALTER TABLE "offer_templates" DROP CONSTRAINT "FK_fc06517d6c23b6580ef12a26456"`
    );

    // Drop foreign keys for leads
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_87219604e711425455fc71001d0"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_6fb5366e90bc6455ebf2f749d65"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_b27f38bac494d6a2a8d899e3caf"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT "FK_533da3a3887638192a5dfa2c176"`);

    // Drop offer_activities table and indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_1e8fdea487cf6e875e430b225a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e9188f5d3fd0f93eec87043f7e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c20c085cb673576c0c53ee9dd2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e5e0d753a443fb3a8543d875f3"`);
    await queryRunner.query(`DROP TABLE "offer_activities"`);

    // Drop offers table and indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_49aeaf4d165a214b570147e891"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_434239966cb60e2dbc6178f993"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_35e302c723589bd6d3400750aa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b61050145eac90a452ac93c7d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3c9f489dd21fc4a1cc57388e72"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ce1c20a7ea3b20350346f27d6e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9bfc970e1273291290659c9e03"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8c5cbc1721532c31fc1a245433"`);
    await queryRunner.query(`DROP TABLE "offers"`);

    // Drop offer_templates table and indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_fc06517d6c23b6580ef12a2645"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cd9a153d5c274335570d0e91dc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_00565804217b27a7e2a4ace362"`);
    await queryRunner.query(`DROP TABLE "offer_templates"`);

    // Drop leads table and indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_b27f38bac494d6a2a8d899e3ca"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_491b018d616822bd64ce7d4726"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b65118404b3b0f8898ddf0c9ee"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2fedf4139199486f08e21ff0b3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4ad4cd6f286a59dc50ec96e485"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b3eea7add0e16594dba102716c"`);
    await queryRunner.query(`DROP TABLE "leads"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."offer_activities_activitytype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."offers_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leads_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."leads_status_enum"`);
  }
}
