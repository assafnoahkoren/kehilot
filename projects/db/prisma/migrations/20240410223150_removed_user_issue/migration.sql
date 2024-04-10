/*
  Warnings:

  - You are about to drop the column `userId` on the `Issue` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Issue] DROP CONSTRAINT [Issue_userId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Issue] DROP COLUMN [userId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
