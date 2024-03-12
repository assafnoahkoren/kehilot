/*
  Warnings:

  - You are about to drop the column `groupId` on the `GroupMember` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `GroupMember` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `OrganizationMember` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `OrganizationMember` table. All the data in the column will be lost.
  - Added the required column `group_id` to the `GroupMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `GroupMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `OrganizationMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `OrganizationMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FREE_TEXT');

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_profileId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_profileId_fkey";

-- AlterTable
ALTER TABLE "GroupMember" DROP COLUMN "groupId",
DROP COLUMN "profileId",
ADD COLUMN     "group_id" TEXT NOT NULL,
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationMember" DROP COLUMN "organizationId",
DROP COLUMN "profileId",
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledExam" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "examId" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" "QuestionType" NOT NULL,
    "exam_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "image_url" TEXT,
    "expected_answer" TEXT,
    "options" TEXT[],
    "correct_options" BOOLEAN[],
    "boolean_expected_answer" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
