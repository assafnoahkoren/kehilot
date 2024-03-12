/*
  Warnings:

  - You are about to drop the column `date` on the `ScheduledExam` table. All the data in the column will be lost.
  - You are about to drop the column `examId` on the `ScheduledExam` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `ScheduledExam` table. All the data in the column will be lost.
  - Added the required column `end_time` to the `ScheduledExam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exam_id` to the `ScheduledExam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `ScheduledExam` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ScheduledExam" DROP CONSTRAINT "ScheduledExam_examId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledExam" DROP CONSTRAINT "ScheduledExam_groupId_fkey";

-- AlterTable
ALTER TABLE "ScheduledExam" DROP COLUMN "date",
DROP COLUMN "examId",
DROP COLUMN "groupId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exam_id" TEXT NOT NULL,
ADD COLUMN     "group_id" TEXT,
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3),
ALTER COLUMN "profile_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
