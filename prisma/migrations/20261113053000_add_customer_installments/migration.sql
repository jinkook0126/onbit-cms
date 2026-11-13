-- CreateEnum
CREATE TYPE "installment_kind" AS ENUM ('DEPOSIT', 'INSTALLMENT');

-- CreateTable
CREATE TABLE "customer_installments" (
    "id" UUID NOT NULL,
    "customer_case_id" UUID NOT NULL,
    "kind" "installment_kind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "promised_on" DATE NOT NULL,
    "scheduled_amount" INTEGER NOT NULL,
    "received_amount" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_installments_customer_case_id_idx" ON "customer_installments"("customer_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_installments_customer_case_id_sequence_key" ON "customer_installments"("customer_case_id", "sequence");

-- AddForeignKey
ALTER TABLE "customer_installments" ADD CONSTRAINT "customer_installments_customer_case_id_fkey" FOREIGN KEY ("customer_case_id") REFERENCES "customer_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
