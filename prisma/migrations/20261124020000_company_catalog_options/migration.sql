-- CreateTable
CREATE TABLE "consultation_status_options" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "code" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consultation_status_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inflow_source_options" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "code" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inflow_source_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_type_options" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "code" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "case_type_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultation_status_options_company_id_name_key" ON "consultation_status_options"("company_id", "name");

-- CreateIndex
CREATE INDEX "consultation_status_options_company_id_sort_order_idx" ON "consultation_status_options"("company_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "inflow_source_options_company_id_name_key" ON "inflow_source_options"("company_id", "name");

-- CreateIndex
CREATE INDEX "inflow_source_options_company_id_sort_order_idx" ON "inflow_source_options"("company_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "case_type_options_company_id_name_key" ON "case_type_options"("company_id", "name");

-- CreateIndex
CREATE INDEX "case_type_options_company_id_sort_order_idx" ON "case_type_options"("company_id", "sort_order");

-- AddForeignKey
ALTER TABLE "consultation_status_options" ADD CONSTRAINT "consultation_status_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inflow_source_options" ADD CONSTRAINT "inflow_source_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_type_options" ADD CONSTRAINT "case_type_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed defaults for every company
INSERT INTO "consultation_status_options" ("id", "company_id", "name", "code", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), c."id", v."name", v."code", v."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (
  VALUES
    ('상담중', 'IN_CONSULTATION', 0),
    ('고민중', 'CONSIDERING', 1),
    ('부재', 'ABSENT', 2),
    ('거절', 'REJECTED', 3),
    ('수임', 'RETAINED', 4)
) AS v("name", "code", "sort_order");

INSERT INTO "inflow_source_options" ("id", "company_id", "name", "code", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), c."id", v."name", v."code", v."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (
  VALUES
    ('홈페이지', 'HOMEPAGE', 0),
    ('네이버', 'NAVER', 1),
    ('거래처 소개', 'REFERRAL', 2),
    ('전화', 'PHONE', 3),
    ('기타', 'OTHER', 4)
) AS v("name", "code", "sort_order");

INSERT INTO "case_type_options" ("id", "company_id", "name", "code", "sort_order", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), c."id", v."name", v."code", v."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (
  VALUES
    ('개인회생', 'PERSONAL_REHABILITATION', 0),
    ('개인파산', 'PERSONAL_BANKRUPTCY', 1),
    ('개인워크아웃', 'PERSONAL_WORKOUT', 2),
    ('신속채무조정', 'FAST_DEBT_ADJUSTMENT', 3),
    ('새출발기금', 'FRESH_START_FUND', 4),
    ('개회+신복위', 'REHABILITATION_AND_CREDIT_RECOVERY', 5),
    ('기타', 'OTHER', 6)
) AS v("name", "code", "sort_order");

-- Add nullable FK columns
ALTER TABLE "customers" ADD COLUMN "source_id" UUID;
ALTER TABLE "customers" ADD COLUMN "status_id" UUID;
ALTER TABLE "customers" ADD COLUMN "case_type_id" UUID;
ALTER TABLE "customer_cases" ADD COLUMN "case_type_id" UUID;

-- Backfill customers from enum values
UPDATE "customers" AS c
SET "source_id" = s."id"
FROM "inflow_source_options" s
WHERE s."company_id" = c."company_id"
  AND s."code" = c."source"::text;

UPDATE "customers" AS c
SET "status_id" = st."id"
FROM "consultation_status_options" st
WHERE st."company_id" = c."company_id"
  AND st."code" = c."status"::text;

UPDATE "customers" AS c
SET "case_type_id" = ct."id"
FROM "case_type_options" ct
WHERE c."case_type" IS NOT NULL
  AND ct."company_id" = c."company_id"
  AND ct."code" = c."case_type"::text;

UPDATE "customer_cases" AS cc
SET "case_type_id" = ct."id"
FROM "customers" c,
     "case_type_options" ct
WHERE c."id" = cc."customer_id"
  AND ct."company_id" = c."company_id"
  AND ct."code" = cc."case_type"::text;

-- Enforce NOT NULL
ALTER TABLE "customers" ALTER COLUMN "source_id" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "status_id" SET NOT NULL;
ALTER TABLE "customer_cases" ALTER COLUMN "case_type_id" SET NOT NULL;

-- Drop old enum columns
ALTER TABLE "customers" DROP COLUMN "source";
ALTER TABLE "customers" DROP COLUMN "status";
ALTER TABLE "customers" DROP COLUMN "case_type";
ALTER TABLE "customer_cases" DROP COLUMN "case_type";

-- Indexes and FKs
CREATE INDEX "customers_source_id_idx" ON "customers"("source_id");
CREATE INDEX "customers_status_id_idx" ON "customers"("status_id");
CREATE INDEX "customers_case_type_id_idx" ON "customers"("case_type_id");
CREATE INDEX "customer_cases_case_type_id_idx" ON "customer_cases"("case_type_id");

ALTER TABLE "customers" ADD CONSTRAINT "customers_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "inflow_source_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "consultation_status_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_case_type_id_fkey" FOREIGN KEY ("case_type_id") REFERENCES "case_type_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_case_type_id_fkey" FOREIGN KEY ("case_type_id") REFERENCES "case_type_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnums
DROP TYPE "consultation_status";
DROP TYPE "inflow_source";
DROP TYPE "case_type";
