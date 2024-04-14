/*
  Warnings:

  - You are about to drop the column `created_at` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Resident` table. All the data in the column will be lost.
  - Added the required column `city` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `father_id` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mother_id` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `street` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Made the column `gov_id` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `first_name` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `last_name` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mother_name` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `father_name` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `year_of_birth` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `month_of_birth` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `day_of_birth` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `personal_status` on table `Resident` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Resident] ALTER COLUMN [gov_id] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [first_name] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [last_name] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [phone] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [mother_name] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [father_name] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [year_of_birth] INT NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [month_of_birth] INT NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [day_of_birth] INT NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [status] INT NOT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [personal_status] INT NOT NULL;
ALTER TABLE [dbo].[Resident] DROP COLUMN [created_at],
[updated_at];
ALTER TABLE [dbo].[Resident] ADD [apt] NVARCHAR(1000),
[city] NVARCHAR(1000) NOT NULL,
[father_id] NVARCHAR(1000) NOT NULL,
[mother_id] NVARCHAR(1000) NOT NULL,
[number] NVARCHAR(1000),
[street] NVARCHAR(1000) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
