-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "next_contact_on" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultations_customer_id_created_at_idx" ON "consultations"("customer_id", "created_at");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
