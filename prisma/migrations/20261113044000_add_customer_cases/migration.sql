-- CreateEnum
CREATE TYPE "case_type" AS ENUM ('PERSONAL_REHABILITATION', 'PERSONAL_BANKRUPTCY', 'PERSONAL_WORKOUT', 'FAST_DEBT_ADJUSTMENT', 'FRESH_START_FUND');

-- CreateTable
CREATE TABLE "customer_cases" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "contracted_on" DATE NOT NULL,
    "case_type" "case_type" NOT NULL,
    "retainer_fee" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "first_payment_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_cases_customer_id_key" ON "customer_cases"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
