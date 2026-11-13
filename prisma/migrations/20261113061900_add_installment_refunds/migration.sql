-- CreateTable
CREATE TABLE "installment_refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "refunded_on" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "installment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installment_refunds_payment_id_idx" ON "installment_refunds"("payment_id");

-- AddForeignKey
ALTER TABLE "installment_refunds" ADD CONSTRAINT "installment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "installment_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
