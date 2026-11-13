-- CreateEnum
CREATE TYPE "consultation_status" AS ENUM ('IN_CONSULTATION', 'CONSIDERING', 'ABSENT', 'REJECTED', 'RETAINED');

-- CreateEnum
CREATE TYPE "inflow_source" AS ENUM ('HOMEPAGE', 'NAVER', 'REFERRAL', 'PHONE', 'OTHER');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "source" "inflow_source" NOT NULL,
    "status" "consultation_status" NOT NULL DEFAULT 'IN_CONSULTATION',
    "assignee_id" UUID,
    "next_contact_on" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_assignee_id_idx" ON "customers"("assignee_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
