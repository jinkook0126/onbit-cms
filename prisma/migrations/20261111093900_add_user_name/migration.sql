-- AlterTable
ALTER TABLE "users" ADD COLUMN "name" TEXT;

-- 기존 회원은 아직 이름이 없으므로 로그인 아이디를 초기값으로 둔다.
UPDATE "users" SET "name" = "login_id" WHERE "name" IS NULL;

ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
