import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. Generated from the entities with `migration:generate`, then
 * extended with pg_trgm indexes that TypeORM cannot express (entity indexes
 * marked `synchronize: false`), which make the ILIKE '%keyword%' search indexable.
 */
export class InitialSchema1790000000000 implements MigrationInterface {
  name = 'InitialSchema1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "fullname" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )`);

    await queryRunner.query(
      `CREATE TYPE "public"."invoice_status" AS ENUM('Draft', 'Pending', 'Paid')`,
    );

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "invoice_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "invoice_number" character varying(50) NOT NULL,
        "invoice_reference" character varying(100),
        "invoice_date" date NOT NULL,
        "due_date" date NOT NULL,
        "currency" character(3) NOT NULL,
        "currency_symbol" character varying(10) NOT NULL,
        "description" text,
        "status" "public"."invoice_status" NOT NULL DEFAULT 'Draft',
        "tax_rate" numeric(5,2) NOT NULL,
        "invoice_sub_total" numeric(14,2) NOT NULL,
        "total_tax" numeric(14,2) NOT NULL,
        "total_discount" numeric(14,2) NOT NULL,
        "total_amount" numeric(14,2) NOT NULL,
        "total_paid" numeric(14,2) NOT NULL DEFAULT '0',
        "balance_amount" numeric(14,2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" uuid NOT NULL,
        "customer_fullname" character varying(255) NOT NULL,
        "customer_email" character varying(255) NOT NULL,
        "customer_mobile_number" character varying(30),
        "customer_address" character varying(500),
        CONSTRAINT "UQ_invoices_invoice_number" UNIQUE ("invoice_number"),
        CONSTRAINT "CHK_invoices_balance" CHECK ("balance_amount" = "total_amount" - "total_paid"),
        CONSTRAINT "CHK_invoices_amounts" CHECK ("invoice_sub_total" >= 0 AND "total_tax" >= 0 AND "total_discount" >= 0 AND "total_amount" >= 0 AND "total_paid" >= 0),
        CONSTRAINT "CHK_invoices_tax_rate" CHECK ("tax_rate" >= 0 AND "tax_rate" <= 100),
        CONSTRAINT "CHK_invoices_due_date" CHECK ("due_date" >= "invoice_date"),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("invoice_id")
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_created_by" ON "invoices" ("created_by")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_total_amount" ON "invoices" ("total_amount")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_invoices_due_date" ON "invoices" ("due_date")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_invoice_date" ON "invoices" ("invoice_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_status_due_date" ON "invoices" ("status", "due_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_invoice_number_trgm" ON "invoices" USING gin ("invoice_number" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invoices_customer_fullname_trgm" ON "invoices" USING gin ("customer_fullname" gin_trgm_ops)`,
    );

    await queryRunner.query(`
      CREATE TABLE "invoice_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "invoice_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "quantity" integer NOT NULL,
        "rate" numeric(14,2) NOT NULL,
        CONSTRAINT "CHK_invoice_items_rate" CHECK ("rate" > 0),
        CONSTRAINT "CHK_invoice_items_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "PK_invoice_items" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_invoice_items_invoice_id" ON "invoice_items" ("invoice_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_invoice_items_invoice_id" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_invoice_items_invoice_id"`,
    );
    await queryRunner.query(`DROP TABLE "invoice_items"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoice_status"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
