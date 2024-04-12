BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Resident] ALTER COLUMN [first_name] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [last_name] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [age] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [mother_name] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [father_name] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [sex] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [year_of_birth] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [month_of_birth] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [day_of_birth] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [status] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [personal_status] INT NULL;
ALTER TABLE [dbo].[Resident] ALTER COLUMN [created_at] DATETIME2 NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
