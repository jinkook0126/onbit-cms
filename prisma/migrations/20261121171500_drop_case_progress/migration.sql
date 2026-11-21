-- AlterTable
ALTER TABLE "customer_cases" DROP COLUMN "progress_stage",
DROP COLUMN "next_task",
DROP COLUMN "task_due_on";

-- DropEnum
DROP TYPE "case_progress_stage";
