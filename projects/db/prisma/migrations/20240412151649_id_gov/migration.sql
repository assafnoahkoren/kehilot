BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Resident] (
    [id] NVARCHAR(1000) NOT NULL,
    [gov_id] NVARCHAR(1000),
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [age] INT NOT NULL,
    [phone] NVARCHAR(1000),
    [mother_name] NVARCHAR(1000) NOT NULL,
    [father_name] NVARCHAR(1000) NOT NULL,
    [sex] INT NOT NULL,
    [year_of_birth] INT NOT NULL,
    [month_of_birth] INT NOT NULL,
    [day_of_birth] INT NOT NULL,
    [status] INT NOT NULL,
    [personal_status] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Resident_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2,
    CONSTRAINT [Resident_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
