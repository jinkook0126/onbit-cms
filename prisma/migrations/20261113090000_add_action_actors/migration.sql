ALTER TABLE "consultations" ADD COLUMN "actor_id" UUID,
ADD COLUMN "updated_by_id" UUID;

ALTER TABLE "installment_payments" ADD COLUMN "actor_id" UUID;

ALTER TABLE "installment_refunds" ADD COLUMN "actor_id" UUID;

CREATE INDEX "consultations_actor_id_idx" ON "consultations"("actor_id");

CREATE INDEX "consultations_updated_by_id_idx" ON "consultations"("updated_by_id");

CREATE INDEX "installment_payments_actor_id_idx" ON "installment_payments"("actor_id");

CREATE INDEX "installment_refunds_actor_id_idx" ON "installment_refunds"("actor_id");

ALTER TABLE "consultations" ADD CONSTRAINT "consultations_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consultations" ADD CONSTRAINT "consultations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "installment_payments" ADD CONSTRAINT "installment_payments_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "installment_refunds" ADD CONSTRAINT "installment_refunds_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
