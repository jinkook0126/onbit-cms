-- CreateEnum
CREATE TYPE "case_progress_stage" AS ENUM ('DOCUMENT_COLLECTION', 'CORRECTION', 'FILING', 'COMMENCEMENT', 'APPROVAL', 'CLOSURE');

-- AlterTable
ALTER TABLE "customer_cases"
ADD COLUMN "progress_stage" "case_progress_stage" NOT NULL DEFAULT 'DOCUMENT_COLLECTION',
ADD COLUMN "next_task" TEXT NOT NULL DEFAULT '서류 요청',
ADD COLUMN "task_due_on" DATE;
