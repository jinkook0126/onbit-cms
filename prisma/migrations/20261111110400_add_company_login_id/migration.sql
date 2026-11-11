ALTER TABLE "companies" ADD COLUMN "login_id" VARCHAR(64) NOT NULL;

CREATE UNIQUE INDEX "companies_login_id_key" ON "companies"("login_id");
