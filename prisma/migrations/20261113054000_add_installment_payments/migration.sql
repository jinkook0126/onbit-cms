-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD');

-- CreateTable
CREATE TABLE "installment_payments" (
    "id" UUID NOT NULL,
    "installment_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_on" DATE NOT NULL,
    "method" "payment_method" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "installment_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installment_payments_installment_id_idx" ON "installment_payments"("installment_id");

-- AddForeignKey
ALTER TABLE "installment_payments" ADD CONSTRAINT "installment_payments_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "customer_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
